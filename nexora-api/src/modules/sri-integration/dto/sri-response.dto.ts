export class SriResponseDto {
    state: string;
    authorizationNumber?: string;
    authorizedAt?: Date;
    messages: Array<{
    message: string;
    messageType: string;
    additionalInfo?: string;
    }>;
    rawResponse: any;
}