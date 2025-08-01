import PersonProfile, { IPersonProfile } from '../models/PersonProfile';
import axios from 'axios';
import { Types } from 'mongoose';

export interface FaceRecognitionResponse {
  success: boolean;
  personId?: string;
  personName?: string;
  facesRegistered?: number;
  imagesProcessed?: number;
  totalImages?: number;
  error?: string;
}

export interface PersonProfileData {
  name: string;
  description?: string;
  trainingImages: string[];
}

class PersonProfileService {
  private faceRecognitionUrl: string;

  constructor() {
    this.faceRecognitionUrl = process.env.FACE_RECOGNITION_SERVICE_URL || 'http://localhost:5001';
  }

  /**
   * Create a new person profile with face recognition training
   */
  async createPersonProfile(
    userId: string,
    profileData: PersonProfileData
  ): Promise<IPersonProfile> {
    try {
      // First create the person profile in database
      const personProfile = new PersonProfile({
        name: profileData.name,
        description: profileData.description,
        userId: new Types.ObjectId(userId),
        trainingImages: profileData.trainingImages,
        faceEmbeddings: [], // Will be populated after face recognition
        isActive: true
      });

      const savedProfile = await personProfile.save();

      // Register with face recognition service
      try {
        const faceRecognitionResponse = await this.registerWithFaceRecognition(
          savedProfile._id!.toString(),
          profileData.name,
          profileData.trainingImages
        );

        if (faceRecognitionResponse.success && faceRecognitionResponse.facesRegistered) {
          // Update profile with success status
          console.log(`✅ Face recognition registered for ${profileData.name}: ${faceRecognitionResponse.facesRegistered} faces`);
        } else {
          console.warn(`⚠️ Face recognition registration failed for ${profileData.name}:`, faceRecognitionResponse.error);
        }
      } catch (faceError) {
        console.error(`❌ Face recognition service error for ${profileData.name}:`, faceError);
        // Don't fail the entire operation, just log the error
      }

      return savedProfile;
    } catch (error) {
      console.error('Error creating person profile:', error);
      throw new Error(`Failed to create person profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all active person profiles for a user
   */
  async getPersonProfilesByUser(userId: string): Promise<IPersonProfile[]> {
    try {
      return await PersonProfile.find({
        userId: new Types.ObjectId(userId),
        isActive: true
      }).sort({ name: 1 });
    } catch (error) {
      console.error('Error fetching person profiles:', error);
      throw new Error('Failed to fetch person profiles');
    }
  }

  /**
   * Get person profile by ID
   */
  async getPersonProfileById(profileId: string, userId: string): Promise<IPersonProfile | null> {
    try {
      return await PersonProfile.findOne({
        _id: new Types.ObjectId(profileId),
        userId: new Types.ObjectId(userId),
        isActive: true
      });
    } catch (error) {
      console.error('Error fetching person profile:', error);
      throw new Error('Failed to fetch person profile');
    }
  }

  /**
   * Update person profile
   */
  async updatePersonProfile(
    profileId: string,
    userId: string,
    updates: Partial<PersonProfileData>
  ): Promise<IPersonProfile | null> {
    try {
      const profile = await PersonProfile.findOne({
        _id: new Types.ObjectId(profileId),
        userId: new Types.ObjectId(userId)
      });

      if (!profile) {
        throw new Error('Person profile not found');
      }

      // Update basic fields
      if (updates.name) profile.name = updates.name;
      if (updates.description !== undefined) profile.description = updates.description;

      // If training images are updated, re-register with face recognition
      if (updates.trainingImages && updates.trainingImages.length > 0) {
        profile.trainingImages = updates.trainingImages;
        
        try {
          await this.registerWithFaceRecognition(
            profileId,
            profile.name,
            updates.trainingImages
          );
        } catch (faceError) {
          console.error('Face recognition update failed:', faceError);
          // Continue with database update even if face recognition fails
        }
      }

      return await profile.save();
    } catch (error) {
      console.error('Error updating person profile:', error);
      throw new Error(`Failed to update person profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete person profile
   */
  async deletePersonProfile(profileId: string, userId: string): Promise<boolean> {
    try {
      const profile = await PersonProfile.findOne({
        _id: new Types.ObjectId(profileId),
        userId: new Types.ObjectId(userId)
      });

      if (!profile) {
        return false;
      }

      // Deactivate the profile instead of hard delete
      profile.isActive = false;
      await profile.save();

      // Remove from face recognition service
      try {
        await this.deleteFaceRecognitionData(profileId);
      } catch (faceError) {
        console.error('Face recognition deletion failed:', faceError);
        // Continue even if face recognition deletion fails
      }

      return true;
    } catch (error) {
      console.error('Error deleting person profile:', error);
      throw new Error('Failed to delete person profile');
    }
  }

  /**
   * Add training images to existing profile
   */
  async addTrainingImages(
    profileId: string,
    userId: string,
    newImages: string[]
  ): Promise<IPersonProfile | null> {
    try {
      const profile = await PersonProfile.findOne({
        _id: new Types.ObjectId(profileId),
        userId: new Types.ObjectId(userId),
        isActive: true
      });

      if (!profile) {
        throw new Error('Person profile not found');
      }

      // Add new images to existing ones
      const allImages = [...profile.trainingImages, ...newImages];
      profile.trainingImages = allImages;

      // Re-register with face recognition service with all images
      try {
        await this.registerWithFaceRecognition(
          profileId,
          profile.name,
          allImages
        );
      } catch (faceError) {
        console.error('Face recognition re-registration failed:', faceError);
      }

      return await profile.save();
    } catch (error) {
      console.error('Error adding training images:', error);
      throw new Error(`Failed to add training images: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Register person with face recognition service
   */
  private async registerWithFaceRecognition(
    personId: string,
    personName: string,
    trainingImages: string[]
  ): Promise<FaceRecognitionResponse> {
    try {
      const response = await axios.post(
        `${this.faceRecognitionUrl}/api/face/register`,
        {
          personId,
          personName,
          trainingImages
        },
        {
          timeout: 30000, // 30 second timeout for face processing
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data as FaceRecognitionResponse;
    } catch (error: any) {
      if (error.isAxiosError) {
        throw new Error(`Face recognition service error: ${error.response?.data?.error || error.message}`);
      }
      throw new Error(`Face recognition service error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete face recognition data
   */
  private async deleteFaceRecognitionData(personId: string): Promise<void> {
    try {
      await axios.delete(
        `${this.faceRecognitionUrl}/api/face/persons/${personId}`,
        { timeout: 10000 }
      );
    } catch (error) {
      // Log but don't throw - this is cleanup
      console.warn(`Face recognition deletion warning for ${personId}:`, error);
    }
  }

  /**
   * Test face recognition service connection
   */
  async testFaceRecognitionService(): Promise<boolean> {
    try {
      const response = await axios.get(
        `${this.faceRecognitionUrl}/health`,
        { timeout: 5000 }
      );
      return (response.data as any).status === 'healthy';
    } catch (error) {
      console.error('Face recognition service health check failed:', error);
      return false;
    }
  }
}

export default PersonProfileService;