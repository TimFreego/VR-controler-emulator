export interface SensorValues {
  values: number[];
}

export interface SensorPacket {
  "Motion Accel"?: SensorValues;
  "Pseudo Gyro"?: SensorValues;
  [key: string]: SensorValues | undefined;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface ControllerState {
  position: Vector3;
  rotation: Quaternion; // stored as quaternion for gimbal lock prevention
  velocity: Vector3;
  lastUpdate: number;
}