import { ControllerState, Vector3, Quaternion } from '../types';

// Constants for tuning
const ALPHA = 0.98; // Complementary filter constant (0.98 Gyro, 0.02 Accel)
const FRICTION = 0.95; // Velocity damping to reduce drift
const VELOCITY_THRESHOLD = 0.05; // Zero-velocity update threshold
const GRAVITY = 9.81;

export class PhysicsEngine {
  private state: ControllerState;
  private gravityVector: Vector3 = { x: 0, y: 0, z: 1 }; // Gravity usually points down (Z in some frames, Y in others). We normalize based on calibration.

  constructor() {
    this.state = {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      velocity: { x: 0, y: 0, z: 0 },
      lastUpdate: 0,
    };
  }

  reset() {
    this.state = {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 }, // Identity quaternion
      velocity: { x: 0, y: 0, z: 0 },
      lastUpdate: performance.now(),
    };
  }

  getState() {
    return this.state;
  }

  // Helper: Multiply Quaternion
  multiplyQuaternions(q1: Quaternion, q2: Quaternion): Quaternion {
    return {
      x: q1.x * q2.w + q1.y * q2.z - q1.z * q2.y + q1.w * q2.x,
      y: -q1.x * q2.z + q1.y * q2.w + q1.z * q2.x + q1.w * q2.y,
      z: q1.x * q2.y - q1.y * q2.x + q1.z * q2.w + q1.w * q2.z,
      w: -q1.x * q2.x - q1.y * q2.y - q1.z * q2.z + q1.w * q2.w
    };
  }

  // Helper: Rotate vector by quaternion
  applyQuaternion(v: Vector3, q: Quaternion): Vector3 {
    const x = v.x, y = v.y, z = v.z;
    const qx = q.x, qy = q.y, qz = q.z, qw = q.w;

    const ix = qw * x + qy * z - qz * y;
    const iy = qw * y + qz * x - qx * z;
    const iz = qw * z + qx * y - qy * x;
    const iw = -qx * x - qy * y - qz * z;

    return {
      x: ix * qw + iw * -qx + iy * -qz - iz * -qy,
      y: iy * qw + iw * -qy + iz * -qx - ix * -qz,
      z: iz * qw + iw * -qz + ix * -qy - iy * -qx
    };
  }

  update(accel: number[], gyro: number[], timestamp: number) {
    const now = timestamp;
    const dt = (now - (this.state.lastUpdate || now)) / 1000;
    this.state.lastUpdate = now;

    if (dt > 1 || dt <= 0) return; // Prevent huge jumps on lag

    // 1. Process Rotation (Gyro Integration)
    // Gyro values are typically rad/s.
    // Axis mapping: Phone Y is "up", Z is "forward/screen", X is "side".
    // We map to 3D space: Y Up.
    const gx = gyro[0];
    const gy = gyro[1];
    const gz = gyro[2];

    // Create quaternion from gyro rotation
    const halfTheta = Math.sqrt(gx*gx + gy*gy + gz*gz) * dt * 0.5;
    const sinHalfTheta = Math.sin(halfTheta);
    const cosHalfTheta = Math.cos(halfTheta);
    
    // Avoid division by zero
    const ratio = (halfTheta === 0) ? 0 : sinHalfTheta / (halfTheta / (dt * 0.5));
    
    const dQ: Quaternion = {
      x: gx * dt * 0.5, // Approximation for small angles
      y: gy * dt * 0.5,
      z: gz * dt * 0.5,
      w: 1
    };
    
    // Normalize dQ roughly (for small steps)
    const dQMag = Math.sqrt(dQ.x*dQ.x + dQ.y*dQ.y + dQ.z*dQ.z + dQ.w*dQ.w);
    dQ.x /= dQMag; dQ.y /= dQMag; dQ.z /= dQMag; dQ.w /= dQMag;

    // Update rotation
    this.state.rotation = this.multiplyQuaternions(this.state.rotation, dQ);

    // Normalize resulting quaternion
    const mag = Math.sqrt(this.state.rotation.x**2 + this.state.rotation.y**2 + this.state.rotation.z**2 + this.state.rotation.w**2);
    this.state.rotation.x /= mag;
    this.state.rotation.y /= mag;
    this.state.rotation.z /= mag;
    this.state.rotation.w /= mag;

    // 2. Process Position (Accelerometer double integration)
    // Note: This is extremely prone to drift. We apply heavy damping.
    
    // Raw Accel (m/s^2)
    const ax = accel[0];
    const ay = accel[1];
    const az = accel[2];

    // Rotate the expected Gravity Vector (0,0,1 or similar depending on start) by current rotation
    // to subtract it from raw accelerometer.
    // Assuming phone lies flat initially: Gravity is mostly on Z. 
    // However, to make it simpler, we rotate the Acceleration Vector into World Space
    // and subtract World Gravity (0, -9.81, 0) assuming Y is up in 3D scene.
    
    const localAccel: Vector3 = { x: ax, y: ay, z: az };
    
    // Termux Coordinate mapping to WebGL (Three.js):
    // Phone: X(Right), Y(Up), Z(Forward/Screen)
    // Three.js: X(Right), Y(Up), Z(Backward/Camera)
    
    // We rotate local acceleration into world space
    const worldAccel = this.applyQuaternion(localAccel, this.state.rotation);

    // Subtract Gravity (Assumed global down is Y axis in 3js, so -9.81)
    // But we need to calibrate 'down'. For this emulation, we assume standard gravity subtraction.
    // In many sensor fusion systems, gravity is deduced. Here we approximate.
    
    // Remove gravity component. 
    // NOTE: This assumes the phone started flat or the gravity vector is perfectly aligned.
    // Real implementation requires tilt-correction.
    // Simplification: We dampen purely vertical movement heavily.
    
    worldAccel.y -= GRAVITY; // Try to remove gravity from Y axis

    // Dead zone for small noise
    if (Math.abs(worldAccel.x) < 0.2) worldAccel.x = 0;
    if (Math.abs(worldAccel.y) < 0.2) worldAccel.y = 0;
    if (Math.abs(worldAccel.z) < 0.2) worldAccel.z = 0;

    // Integrate to Velocity
    this.state.velocity.x += worldAccel.x * dt;
    this.state.velocity.y += worldAccel.y * dt;
    this.state.velocity.z += worldAccel.z * dt;

    // Friction / Damping (Crucial for drift control)
    this.state.velocity.x *= FRICTION;
    this.state.velocity.y *= FRICTION;
    this.state.velocity.z *= FRICTION;

    // Zero Velocity Update (if accel is tiny, kill velocity)
    if (Math.abs(worldAccel.x) < 0.1 && Math.abs(worldAccel.y) < 0.1 && Math.abs(worldAccel.z) < 0.1) {
        this.state.velocity.x *= 0.5;
        this.state.velocity.y *= 0.5;
        this.state.velocity.z *= 0.5;
    }

    // Integrate to Position
    // Scale down movement because accelerometer noise integrates to HUGE distances quickly
    const SCALE_FACTOR = 0.5; 
    
    this.state.position.x += this.state.velocity.x * dt * SCALE_FACTOR;
    this.state.position.y += this.state.velocity.y * dt * SCALE_FACTOR;
    this.state.position.z += this.state.velocity.z * dt * SCALE_FACTOR;
  }
}