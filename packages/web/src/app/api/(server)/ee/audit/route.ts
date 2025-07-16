import { serviceErrorResponse } from "@/lib/serviceError";
import { StatusCodes } from "http-status-codes";
import { ErrorCode } from "@/lib/errorCodes";

export const GET = async () => {
  // Audit feature removed
  return serviceErrorResponse({
    statusCode: StatusCodes.NOT_FOUND,
    errorCode: ErrorCode.NOT_FOUND,
    message: "Audit logging feature has been removed",
  });
}; 