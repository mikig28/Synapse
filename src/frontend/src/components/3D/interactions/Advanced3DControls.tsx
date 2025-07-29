import React, { useRef, useEffect, useState, useCallback, useLayoutEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { OrbitControls } from '@react-three/drei';
import { Vector3, Euler, Quaternion, MOUSE, TOUCH, Spherical } from 'three';
import * as THREE from 'three';

interface CameraTarget {
  position: Vector3;
  target: Vector3;
  transition: boolean;
  duration: number;
}

interface Advanced3DControlsProps {
  enableZoom?: boolean;
  enablePan?: boolean;
  enableRotate?: boolean;
  enableKeyboard?: boolean;
  enableTouch?: boolean;
  enableGestures?: boolean;
  enableAutoRotate?: boolean;
  autoRotateSpeed?: number;
  enableDamping?: boolean;
  dampingFactor?: number;
  minDistance?: number;
  maxDistance?: number;
  maxPolarAngle?: number;
  minPolarAngle?: number;
  enableFocusMode?: boolean;
  accessibilityMode?: boolean;
  onSelectionChange?: (objectId: string | null) => void;
}

// Gesture recognition for touch devices
class GestureRecognizer {
  private isGesturing = false;
  private initialDistance = 0;
  private initialRotation = 0;
  private lastTouches: TouchList | null = null;

  detectPinch(touches: TouchList): { scale: number; rotation: number } | null {
    if (touches.length !== 2) return null;

    const touch1 = touches[0];
    const touch2 = touches[1];
    
    const distance = Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );

    const rotation = Math.atan2(
      touch2.clientY - touch1.clientY,
      touch2.clientX - touch1.clientX
    );

    if (!this.isGesturing) {
      this.isGesturing = true;
      this.initialDistance = distance;
      this.initialRotation = rotation;
      return null;
    }

    const scale = distance / this.initialDistance;
    const rotationDelta = rotation - this.initialRotation;

    return { scale, rotation: rotationDelta };
  }

  reset() {
    this.isGesturing = false;
  }
}

// Keyboard navigation helper
class KeyboardNavigator {
  private keys: Set<string> = new Set();
  private onUpdate: (movement: Vector3, rotation: Euler) => void;

  constructor(onUpdate: (movement: Vector3, rotation: Euler) => void) {
    this.onUpdate = onUpdate;
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
  }

  enable() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  disable() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }

  private handleKeyDown(event: KeyboardEvent) {
    // Prevent default for navigation keys
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(event.code)) {
      event.preventDefault();
    }
    this.keys.add(event.code);
  }

  private handleKeyUp(event: KeyboardEvent) {
    this.keys.delete(event.code);
  }

  update(deltaTime: number) {
    const movement = new Vector3();
    const rotation = new Euler();
    const speed = 5 * deltaTime;
    const rotationSpeed = 2 * deltaTime;

    // Movement
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) movement.z -= speed;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) movement.z += speed;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) movement.x -= speed;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) movement.x += speed;
    if (this.keys.has('KeyQ')) movement.y += speed;
    if (this.keys.has('KeyE')) movement.y -= speed;

    // Rotation
    if (this.keys.has('KeyI')) rotation.x -= rotationSpeed;
    if (this.keys.has('KeyK')) rotation.x += rotationSpeed;
    if (this.keys.has('KeyJ')) rotation.y += rotationSpeed;
    if (this.keys.has('KeyL')) rotation.y -= rotationSpeed;

    if (movement.length() > 0 || rotation.x !== 0 || rotation.y !== 0) {
      this.onUpdate(movement, rotation);
    }
  }
}

// Camera animation helper
class CameraAnimator {
  private isAnimating = false;
  private startPosition = new Vector3();
  private startTarget = new Vector3();
  private endPosition = new Vector3();
  private endTarget = new Vector3();
  private duration = 1000;
  private startTime = 0;
  private onComplete?: () => void;

  animate(
    currentPosition: Vector3,
    currentTarget: Vector3,
    targetPosition: Vector3,
    targetTarget: Vector3,
    duration = 1000,
    onComplete?: () => void
  ) {
    this.startPosition.copy(currentPosition);
    this.startTarget.copy(currentTarget);
    this.endPosition.copy(targetPosition);
    this.endTarget.copy(targetTarget);
    this.duration = duration;
    this.startTime = performance.now();
    this.onComplete = onComplete;
    this.isAnimating = true;
  }

  update(
    setPosition: (pos: Vector3) => void,
    setTarget: (target: Vector3) => void
  ): boolean {
    if (!this.isAnimating) return false;

    const elapsed = performance.now() - this.startTime;
    const progress = Math.min(elapsed / this.duration, 1);
    
    // Smooth easing function
    const eased = 1 - Math.pow(1 - progress, 3);

    // Interpolate position and target
    const currentPos = this.startPosition.clone().lerp(this.endPosition, eased);
    const currentTarget = this.startTarget.clone().lerp(this.endTarget, eased);

    setPosition(currentPos);
    setTarget(currentTarget);

    if (progress >= 1) {
      this.isAnimating = false;
      this.onComplete?.();
    }

    return this.isAnimating;
  }

  stop() {
    this.isAnimating = false;
  }

  get animating() {
    return this.isAnimating;
  }
}

export function Advanced3DControls({
  enableZoom = true,
  enablePan = true,
  enableRotate = true,
  enableKeyboard = true,
  enableTouch = true,
  enableGestures = true,
  enableAutoRotate = false,
  autoRotateSpeed = 2,
  enableDamping = true,
  dampingFactor = 0.05,
  minDistance = 3,
  maxDistance = 50,
  maxPolarAngle = Math.PI / 1.8,
  minPolarAngle = Math.PI / 6,
  enableFocusMode = true,
  accessibilityMode = false,
  onSelectionChange
}: Advanced3DControlsProps) {
  const { camera, gl, raycaster, scene } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const [selectedObject, setSelectedObject] = useState<string | null>(null);
  const [isAutoRotating, setIsAutoRotating] = useState(enableAutoRotate);
  
  // Gesture and navigation helpers
  const gestureRecognizer = useRef(new GestureRecognizer());
  const keyboardNavigator = useRef<KeyboardNavigator | null>(null);
  const cameraAnimator = useRef(new CameraAnimator());

  // Accessibility announcements
  const announceToScreenReader = useCallback((message: string) => {
    if (accessibilityMode) {
      const announcement = document.createElement('div');
      announcement.setAttribute('aria-live', 'polite');
      announcement.setAttribute('aria-atomic', 'true');
      announcement.style.position = 'absolute';
      announcement.style.left = '-10000px';
      announcement.textContent = message;
      document.body.appendChild(announcement);
      setTimeout(() => document.body.removeChild(announcement), 1000);
    }
  }, [accessibilityMode]);

  // Focus on specific object
  const focusOnObject = useCallback((objectId: string, position: Vector3) => {
    if (!enableFocusMode || !controlsRef.current) return;

    const controls = controlsRef.current;
    const currentPosition = camera.position.clone();
    const currentTarget = controls.target.clone();
    
    // Calculate optimal camera position
    const direction = currentPosition.clone().sub(position).normalize();
    const optimalDistance = Math.max(minDistance * 2, 8);
    const targetPosition = position.clone().add(direction.multiplyScalar(optimalDistance));
    
    // Animate camera to new position
    cameraAnimator.current.animate(
      currentPosition,
      currentTarget,
      targetPosition,
      position,
      1500,
      () => {
        announceToScreenReader(`Focused on ${objectId}`);
        onSelectionChange?.(objectId);
      }
    );
  }, [camera, enableFocusMode, minDistance, announceToScreenReader, onSelectionChange]);

  // Handle object selection
  const handleSelection = useCallback((event: MouseEvent | TouchEvent) => {
    const isTouch = 'touches' in event;
    const clientX = isTouch ? event.touches[0]?.clientX : (event as MouseEvent).clientX;
    const clientY = isTouch ? event.touches[0]?.clientY : (event as MouseEvent).clientY;
    
    if (!clientX || !clientY) return;

    const rect = gl.domElement.getBoundingClientRect();
    const mouse = {
      x: ((clientX - rect.left) / rect.width) * 2 - 1,
      y: -((clientY - rect.top) / rect.height) * 2 + 1
    };

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
      const object = intersects[0].object;
      let objectId = object.userData.id || object.parent?.userData.id;
      
      if (objectId && objectId !== selectedObject) {
        setSelectedObject(objectId);
        focusOnObject(objectId, intersects[0].point);
      }
    } else {
      setSelectedObject(null);
      onSelectionChange?.(null);
    }
  }, [gl, raycaster, camera, scene, selectedObject, focusOnObject, onSelectionChange]);

  // Keyboard navigation setup
  useEffect(() => {
    if (enableKeyboard && controlsRef.current) {
      const controls = controlsRef.current;
      
      keyboardNavigator.current = new KeyboardNavigator((movement, rotation) => {
        // Apply movement relative to camera orientation
        const cameraDirection = new Vector3();
        camera.getWorldDirection(cameraDirection);
        
        const right = new Vector3();
        right.crossVectors(cameraDirection, camera.up);
        
        const moveVector = new Vector3();
        moveVector.addScaledVector(right, movement.x);
        moveVector.addScaledVector(camera.up, movement.y);
        moveVector.addScaledVector(cameraDirection, -movement.z);
        
        controls.target.add(moveVector);
        camera.position.add(moveVector);
        
        // Apply rotation
        if (rotation.x !== 0 || rotation.y !== 0) {
          // Manual rotation by adjusting camera position around target
          const offset = camera.position.clone().sub(controls.target);
          const spherical = new Spherical().setFromVector3(offset);
          
          spherical.theta += rotation.y;
          spherical.phi += rotation.x;
          spherical.phi = Math.max(minPolarAngle, Math.min(maxPolarAngle, spherical.phi));
          
          offset.setFromSpherical(spherical);
          camera.position.copy(controls.target).add(offset);
        }
      });
      
      keyboardNavigator.current.enable();
      
      return () => {
        keyboardNavigator.current?.disable();
      };
    }
  }, [enableKeyboard, camera, minPolarAngle, maxPolarAngle]);

  // Touch gesture handling
  useEffect(() => {
    if (!enableGestures || !enableTouch) return;

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 2) {
        event.preventDefault();
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length === 2 && controlsRef.current) {
        event.preventDefault();
        
        const gesture = gestureRecognizer.current.detectPinch(event.touches);
        if (gesture) {
          const controls = controlsRef.current;
          
          // Handle pinch zoom
          const zoomDelta = 1 - gesture.scale;
          controls.dollyIn(1 + zoomDelta * 0.1);
          
          // Handle rotation gesture
          if (Math.abs(gesture.rotation) > 0.1) {
            // Manual rotation for gesture
            const offset = camera.position.clone().sub(controls.target);
            const spherical = new Spherical().setFromVector3(offset);
            spherical.theta += gesture.rotation * 0.5;
            offset.setFromSpherical(spherical);
            camera.position.copy(controls.target).add(offset);
          }
        }
      }
    };

    const handleTouchEnd = () => {
      gestureRecognizer.current.reset();
    };

    gl.domElement.addEventListener('touchstart', handleTouchStart);
    gl.domElement.addEventListener('touchmove', handleTouchMove);
    gl.domElement.addEventListener('touchend', handleTouchEnd);

    return () => {
      gl.domElement.removeEventListener('touchstart', handleTouchStart);
      gl.domElement.removeEventListener('touchmove', handleTouchMove);
      gl.domElement.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enableGestures, enableTouch, gl]);

  // Click/tap selection handling
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!enableFocusMode) return;
      handleSelection(event);
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (!enableFocusMode || event.touches.length > 0) return;
      handleSelection(event);
    };

    gl.domElement.addEventListener('click', handleClick);
    gl.domElement.addEventListener('touchend', handleTouchEnd);

    return () => {
      gl.domElement.removeEventListener('click', handleClick);
      gl.domElement.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enableFocusMode, handleSelection, gl]);

  // Auto-rotation toggle
  const toggleAutoRotate = useCallback(() => {
    setIsAutoRotating(prev => !prev);
    announceToScreenReader(`Auto-rotation ${!isAutoRotating ? 'enabled' : 'disabled'}`);
  }, [isAutoRotating, announceToScreenReader]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!enableKeyboard) return;

      switch (event.code) {
        case 'Space':
          event.preventDefault();
          toggleAutoRotate();
          break;
        case 'KeyR':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            // Reset camera position
            if (controlsRef.current) {
              controlsRef.current.reset();
              announceToScreenReader('Camera position reset');
            }
          }
          break;
        case 'Escape':
          setSelectedObject(null);
          onSelectionChange?.(null);
          announceToScreenReader('Selection cleared');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [enableKeyboard, toggleAutoRotate, announceToScreenReader, onSelectionChange]);

  // Animation frame update
  useFrame((state, delta) => {
    if (controlsRef.current) {
      // Update keyboard navigation
      if (enableKeyboard && keyboardNavigator.current) {
        keyboardNavigator.current.update(delta);
      }

      // Update camera animations
      if (cameraAnimator.current.animating) {
        cameraAnimator.current.update(
          (pos) => camera.position.copy(pos),
          (target) => controlsRef.current!.target.copy(target)
        );
      }

      // Update controls
      controlsRef.current.update();
    }
  });

  // Accessibility attributes for the canvas
  useEffect(() => {
    if (accessibilityMode) {
      gl.domElement.setAttribute('role', 'application');
      gl.domElement.setAttribute('aria-label', '3D interactive scene');
      gl.domElement.setAttribute('tabindex', '0');
      
      const instructions = [
        'Use arrow keys or WASD to move camera',
        'Use mouse or touch to rotate view',
        'Press Space to toggle auto-rotation',
        'Press R to reset camera',
        'Click objects to focus on them'
      ].join('. ');
      
      gl.domElement.setAttribute('aria-description', instructions);
    }
  }, [accessibilityMode, gl]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableZoom={enableZoom}
      enablePan={enablePan}
      enableRotate={enableRotate}
      enableDamping={enableDamping}
      dampingFactor={dampingFactor}
      autoRotate={isAutoRotating}
      autoRotateSpeed={autoRotateSpeed}
      minDistance={minDistance}
      maxDistance={maxDistance}
      maxPolarAngle={maxPolarAngle}
      minPolarAngle={minPolarAngle}
      mouseButtons={{
        LEFT: enableRotate ? MOUSE.ROTATE : null,
        MIDDLE: enableZoom ? MOUSE.DOLLY : null,
        RIGHT: enablePan ? MOUSE.PAN : null
      }}
      touches={{
        ONE: enableRotate ? TOUCH.ROTATE : null,
        TWO: enableZoom ? TOUCH.DOLLY_PAN : null
      }}
    />
  );
}

export default Advanced3DControls;