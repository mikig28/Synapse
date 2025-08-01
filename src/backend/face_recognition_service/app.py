from flask import Flask, request, jsonify
import face_recognition
import cv2
import numpy as np
from PIL import Image
import io
import base64
import redis
import json
import os
import logging
from typing import List, Dict, Tuple, Optional
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Redis connection
redis_client = redis.Redis(
    host=os.getenv('REDIS_HOST', 'localhost'),
    port=int(os.getenv('REDIS_PORT', 6379)),
    db=int(os.getenv('REDIS_DB', 0)),
    decode_responses=True
)

class FaceRecognitionService:
    def __init__(self):
        self.model = 'hog'  # Use 'cnn' for better accuracy but slower processing
        self.tolerance = 0.6  # Face matching tolerance
        
    def encode_face_from_base64(self, base64_image: str) -> List[List[float]]:
        """Extract face encodings from base64 image"""
        try:
            # Remove data URL prefix if present
            if base64_image.startswith('data:image'):
                base64_image = base64_image.split(',')[1]
            
            # Decode base64 image
            image_data = base64.b64decode(base64_image)
            image = Image.open(io.BytesIO(image_data))
            
            # Convert to RGB if necessary
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Convert PIL image to numpy array
            image_array = np.array(image)
            
            # Find face locations and encodings
            face_locations = face_recognition.face_locations(image_array, model=self.model)
            face_encodings = face_recognition.face_encodings(image_array, face_locations)
            
            return [encoding.tolist() for encoding in face_encodings]
            
        except Exception as e:
            logger.error(f"Error encoding face from base64: {str(e)}")
            raise Exception(f"Failed to process image: {str(e)}")
    
    def encode_face_from_url(self, image_url: str) -> List[List[float]]:
        """Extract face encodings from image URL"""
        try:
            import requests
            response = requests.get(image_url, timeout=10)
            response.raise_for_status()
            
            image = Image.open(io.BytesIO(response.content))
            
            # Convert to RGB if necessary
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Convert PIL image to numpy array
            image_array = np.array(image)
            
            # Find face locations and encodings
            face_locations = face_recognition.face_locations(image_array, model=self.model)
            face_encodings = face_recognition.face_encodings(image_array, face_locations)
            
            return [encoding.tolist() for encoding in face_encodings]
            
        except Exception as e:
            logger.error(f"Error encoding face from URL: {str(e)}")
            raise Exception(f"Failed to process image from URL: {str(e)}")
    
    def compare_faces(self, known_encodings: List[List[float]], unknown_encoding: List[float]) -> Tuple[List[bool], List[float]]:
        """Compare unknown face encoding with known encodings"""
        try:
            # Convert lists back to numpy arrays
            known_encodings_np = [np.array(encoding) for encoding in known_encodings]
            unknown_encoding_np = np.array(unknown_encoding)
            
            # Compare faces
            matches = face_recognition.compare_faces(known_encodings_np, unknown_encoding_np, tolerance=self.tolerance)
            distances = face_recognition.face_distance(known_encodings_np, unknown_encoding_np)
            
            return matches, distances.tolist()
            
        except Exception as e:
            logger.error(f"Error comparing faces: {str(e)}")
            raise Exception(f"Failed to compare faces: {str(e)}")
    
    def detect_faces_with_locations(self, base64_image: str) -> Dict:
        """Detect faces and return locations and encodings"""
        try:
            # Remove data URL prefix if present
            if base64_image.startswith('data:image'):
                base64_image = base64_image.split(',')[1]
            
            # Decode base64 image
            image_data = base64.b64decode(base64_image)
            image = Image.open(io.BytesIO(image_data))
            
            # Convert to RGB if necessary
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Convert PIL image to numpy array
            image_array = np.array(image)
            
            # Get image dimensions
            height, width = image_array.shape[:2]
            
            # Find face locations and encodings
            face_locations = face_recognition.face_locations(image_array, model=self.model)
            face_encodings = face_recognition.face_encodings(image_array, face_locations)
            
            faces = []
            for i, (location, encoding) in enumerate(zip(face_locations, face_encodings)):
                top, right, bottom, left = location
                faces.append({
                    'id': i,
                    'encoding': encoding.tolist(),
                    'location': {
                        'top': top,
                        'right': right,
                        'bottom': bottom,
                        'left': left
                    },
                    'bounding_box': {
                        'x': left,
                        'y': top,
                        'width': right - left,
                        'height': bottom - top
                    }
                })
            
            return {
                'faces_detected': len(faces),
                'image_dimensions': {'width': width, 'height': height},
                'faces': faces
            }
            
        except Exception as e:
            logger.error(f"Error detecting faces: {str(e)}")
            raise Exception(f"Failed to detect faces: {str(e)}")

# Initialize service
face_service = FaceRecognitionService()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        redis_client.ping()
        return jsonify({
            'status': 'healthy',
            'service': 'face_recognition',
            'redis': 'connected',
            'timestamp': time.time()
        })
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'service': 'face_recognition',
            'redis': 'disconnected',
            'error': str(e),
            'timestamp': time.time()
        }), 500

@app.route('/api/face/register', methods=['POST'])
def register_person():
    """Register a person's face from training images"""
    try:
        data = request.json
        person_id = data.get('personId')
        person_name = data.get('personName')
        training_images = data.get('trainingImages', [])
        
        if not person_id or not person_name or not training_images:
            return jsonify({
                'success': False,
                'error': 'Missing required fields: personId, personName, trainingImages'
            }), 400
        
        all_encodings = []
        processed_images = 0
        
        for i, image_data in enumerate(training_images):
            try:
                if image_data.startswith('http'):
                    encodings = face_service.encode_face_from_url(image_data)
                else:
                    encodings = face_service.encode_face_from_base64(image_data)
                
                all_encodings.extend(encodings)
                processed_images += 1
                logger.info(f"Processed training image {i+1} for {person_name}: {len(encodings)} faces found")
                
            except Exception as e:
                logger.warning(f"Failed to process training image {i+1} for {person_name}: {str(e)}")
                continue
        
        if not all_encodings:
            return jsonify({
                'success': False,
                'error': 'No faces found in training images'
            }), 400
        
        # Store encodings in Redis
        redis_key = f"person_encodings:{person_id}"
        redis_client.set(redis_key, json.dumps({
            'personId': person_id,
            'personName': person_name,
            'encodings': all_encodings,
            'trainingImages': len(training_images),
            'processedImages': processed_images,
            'totalFaces': len(all_encodings),
            'registeredAt': time.time()
        }))
        
        return jsonify({
            'success': True,
            'personId': person_id,
            'personName': person_name,
            'facesRegistered': len(all_encodings),
            'imagesProcessed': processed_images,
            'totalImages': len(training_images)
        })
        
    except Exception as e:
        logger.error(f"Error registering person: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/face/detect', methods=['POST'])
def detect_faces():
    """Detect faces in an image"""
    try:
        data = request.json
        image_data = data.get('image')
        
        if not image_data:
            return jsonify({
                'success': False,
                'error': 'Missing image data'
            }), 400
        
        start_time = time.time()
        result = face_service.detect_faces_with_locations(image_data)
        processing_time = time.time() - start_time
        
        return jsonify({
            'success': True,
            'processingTime': processing_time,
            'result': result
        })
        
    except Exception as e:
        logger.error(f"Error detecting faces: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/face/match', methods=['POST'])
def match_faces():
    """Match detected faces against registered persons"""
    try:
        data = request.json
        image_data = data.get('image')
        person_ids = data.get('personIds', [])
        confidence_threshold = data.get('confidenceThreshold', 0.6)
        
        if not image_data:
            return jsonify({
                'success': False,
                'error': 'Missing image data'
            }), 400
        
        start_time = time.time()
        
        # Detect faces in the image
        detection_result = face_service.detect_faces_with_locations(image_data)
        detected_faces = detection_result['faces']
        
        matches = []
        
        # For each detected face, check against registered persons
        for face in detected_faces:
            face_encoding = face['encoding']
            face_matches = []
            
            # Check against specified persons or all registered persons
            if person_ids:
                keys_to_check = [f"person_encodings:{pid}" for pid in person_ids]
            else:
                keys_to_check = redis_client.keys("person_encodings:*")
            
            for redis_key in keys_to_check:
                try:
                    person_data = redis_client.get(redis_key)
                    if not person_data:
                        continue
                    
                    person_info = json.loads(person_data)
                    known_encodings = person_info['encodings']
                    
                    # Compare with all encodings for this person
                    matches_list, distances = face_service.compare_faces(known_encodings, face_encoding)
                    
                    # Find best match for this person
                    if any(matches_list):
                        best_match_idx = np.argmin(distances)
                        if matches_list[best_match_idx]:
                            confidence = 1 - distances[best_match_idx]
                            if confidence >= confidence_threshold:
                                face_matches.append({
                                    'personId': person_info['personId'],
                                    'personName': person_info['personName'],
                                    'confidence': float(confidence),
                                    'distance': float(distances[best_match_idx])
                                })
                
                except Exception as e:
                    logger.warning(f"Error checking person {redis_key}: {str(e)}")
                    continue
            
            # Sort matches by confidence (highest first)
            face_matches.sort(key=lambda x: x['confidence'], reverse=True)
            
            matches.append({
                'faceId': face['id'],
                'location': face['location'],
                'boundingBox': face['bounding_box'],
                'matches': face_matches
            })
        
        processing_time = time.time() - start_time
        
        return jsonify({
            'success': True,
            'processingTime': processing_time,
            'facesDetected': len(detected_faces),
            'imageDimensions': detection_result['image_dimensions'],
            'matches': matches
        })
        
    except Exception as e:
        logger.error(f"Error matching faces: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/face/persons', methods=['GET'])
def list_registered_persons():
    """List all registered persons"""
    try:
        keys = redis_client.keys("person_encodings:*")
        persons = []
        
        for key in keys:
            try:
                person_data = redis_client.get(key)
                if person_data:
                    person_info = json.loads(person_data)
                    persons.append({
                        'personId': person_info['personId'],
                        'personName': person_info['personName'],
                        'facesRegistered': person_info['totalFaces'],
                        'trainingImages': person_info['trainingImages'],
                        'registeredAt': person_info['registeredAt']
                    })
            except Exception as e:
                logger.warning(f"Error reading person data from {key}: {str(e)}")
                continue
        
        return jsonify({
            'success': True,
            'persons': persons,
            'totalPersons': len(persons)
        })
        
    except Exception as e:
        logger.error(f"Error listing persons: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/face/persons/<person_id>', methods=['DELETE'])
def delete_person(person_id):
    """Delete a registered person"""
    try:
        redis_key = f"person_encodings:{person_id}"
        deleted = redis_client.delete(redis_key)
        
        return jsonify({
            'success': bool(deleted),
            'personId': person_id,
            'deleted': bool(deleted)
        })
        
    except Exception as e:
        logger.error(f"Error deleting person {person_id}: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=False)