export enum QueueName {
    DOCUMENT_SIGNING = 'document-signing',
    DOCUMENT_TRANSMISSION = 'document-transmission',
    RIDE_GENERATION = 'ride-generation',
    RECOVERY = 'recovery',
}

export enum JobName {
    SIGN_DOCUMENT = 'sign-document',
    TRANSMIT_DOCUMENT = 'transmit-document',
    POLL_AUTHORIZATION = 'poll-authorization',
    GENERATE_RIDE = 'generate-ride',
    RECOVER_STUCK = 'recover-stuck',
}