export type PassType =
  | 'VISITOR'
  | 'HOSTEL_GUEST'
  | 'VEHICLE'
  | 'EVENT'
  | 'CONTRACTOR'
  | 'PARENT';

export type PassStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'ACTIVE'
  | 'USED'
  | 'EXPIRED'
  | 'REVOKED';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type LogType = 'ENTRY' | 'EXIT';

export interface Visitor {
  id: string;
  name: string;
  email?: string | null;
  phone: string;
  category: 'GENERAL' | 'VIP' | 'CONTRACTOR' | 'ACADEMIC' | 'GOVERNMENT' | 'VENDOR' | 'PARENT' | 'MEDICAL';
  blacklisted: boolean;
  blacklistReason?: string | null;
  idType: 'AADHAAR' | 'PAN' | 'DRIVING_LICENSE' | 'PASSPORT' | 'OTHER' | 'PAN_CARD' | 'VOTER_ID';
  idNumber: string;
  idPhotoKey?: string | null;
  idPhotoUrl?: string | null;
  company?: string | null;
  createdAt: string;
}

export interface Vehicle {
  id: string;
  ownerId: string;
  numberPlate: string;
  vehicleType: 'TWO_WHEELER' | 'FOUR_WHEELER' | 'TRUCK' | 'BUS' | 'OTHER';
  make?: string | null;
  model?: string | null;
  color?: string | null;
}

export interface VehiclePass {
  id: string;
  passId: string;
  vehicleId: string;
  driverName: string;
  driverPhone: string;
  vehicle?: Vehicle;
}

export interface HostelGuest {
  id: string;
  passId: string;
  wardenId: string;
  hostelBlock: string;
  roomNumber: string;
  plannedNights: number;
}

export interface Approval {
  id: string;
  passId: string;
  approverId: string;
  status: ApprovalStatus;
  remarks?: string | null;
  decidedAt: string;
}

export interface EntryLog {
  id: string;
  passId: string;
  guardId: string;
  gate: string;
  logType: LogType;
  entryAt?: string | null;
  exitAt?: string | null;
  dwellMinutes?: number | null;
  isManualOverride: boolean;
  overrideReason?: string | null;
  vehiclePlate?: string | null;
  createdAt: string;
}

export interface Pass {
  id: string;
  requesterId: string;
  visitorId: string;
  eventId?: string | null;
  passNumber: string;
  passType: PassType;
  status: PassStatus;
  purpose: string;
  notes?: string | null;
  createdByName?: string | null;
  creatorDept?: string | null;
  comingFrom?: string | null;
  validFrom: string;
  validTo: string;
  allowedGates: string[];
  isMultiEntry: boolean;
  qrToken?: string | null;
  qrImageKey?: string | null;
  qrImageUrl?: string | null;
  visitorPhotoUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string | null;
  revokedAt?: string | null;
  revokedReason?: string | null;
  visitor: Visitor;
  requester: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    role: string;
  };
  approvals?: Approval[];
  entryLogs?: EntryLog[];
  vehiclePass?: VehiclePass | null;
  hostelGuest?: HostelGuest | null;
}
