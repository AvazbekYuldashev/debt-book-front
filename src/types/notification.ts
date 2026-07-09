export interface NotificationDTO {
  id: string;
  actorName?: string;
  actorPhone?: string;
  amount?: number;
  currency?: string;
  message: string;
  read: boolean;
  createdDate: string;
}
