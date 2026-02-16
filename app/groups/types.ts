export type ActiveSubscription = {
  id: string;
  serviceName: string;
  serviceKey: string | null;
  planName: string | null;
  planDurationMonths: number | null;
  planMembers: number | null;
  monthlyCost: string;
  externalAccountEmail: string | null;
};

export type GroupMemberInput = {
  id: string;
  email: string;
  percentage: number;
};

export type GroupPaymentStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "PAID" | "REMOVED";

export type GroupMemberRemovalStatus = "NONE" | "PENDING" | "REMOVED";

export type GroupMemberView = {
  userId: string;
  name: string;
  email: string;
  percentage: number;
  amount: string;
  status: GroupPaymentStatus;
  removalRequestStatus: GroupMemberRemovalStatus;
  removedAt: Date | null;
  role: "OWNER" | "MEMBER";
};

export type GroupCardView = {
  groupId: string;
  groupSubscriptionId: string;
  groupName: string;
  createdAt: Date;
  serviceName: string;
  serviceKey: string | null;
  planName: string | null;
  totalCost: string;
  nextBillingDate: string;
  deleteRequestStatus: "NONE" | "PENDING";
  subscriptionStatus: "ACTIVE" | "PENDING" | "CANCELLED" | "INACTIVE";
  externalAccountEmail: string | null;
  externalAccountPassword: string | null;
  ownerName: string;
  members: GroupMemberView[];
  viewerRole: "OWNER" | "MEMBER";
  viewerStatus: GroupPaymentStatus;
  viewerShareAmount?: string;
};
