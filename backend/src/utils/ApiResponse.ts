/**
 * Uniform API Response envelope
 */
export class ApiResponse<T = any> {
  public statusCode: number;
  public success: boolean;
  public message: string;
  public data: T;
  public meta?: any;

  constructor(statusCode: number, data: T, message: string = 'Success', meta?: any) {
    this.statusCode = statusCode;
    this.success = statusCode < 400;
    this.message = message;
    this.data = data;
    if (meta) {
      this.meta = meta;
    }
  }
}
export default ApiResponse;
