import { EventTicket } from "./ticket";

export interface TicketResponse {
    status: string;
    message: string;
    data: EventTicket[];
}

export interface PaymentData {
    transactionId: number;
    status: string;
    paymentUrl: string;
}

export interface TransactionResponse {
    status: boolean;
    message: string;
    data: PaymentData;
}

export interface CallbackResponse {
    status: boolean;
    message: string;
}