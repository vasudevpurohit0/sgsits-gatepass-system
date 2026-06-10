import { z } from 'zod';
import { PassType, IdType, VisitorCategory, VehicleType } from '@prisma/client';
import { VALIDATION_RULES } from '../config/constants';


/**
 * Coerce string booleans from form data into actual booleans
 */
const coerceBoolean = z.union([
  z.boolean(),
  z.literal('true').transform(() => true),
  z.literal('false').transform(() => false),
  z.literal('').transform(() => false),
]).default(false);

export const createPassSchema = z.object({
  body: z.object({
    // Visitor registration details
    visitor: z.object({
      name: z.string().min(2, 'Name must be at least 2 characters').max(100),
      phone: z.string().regex(VALIDATION_RULES.PHONE_REGEX, 'Phone must be in E.164 format (e.g. +919876543210)'),
      email: z.union([
        z.string().email('Invalid email address'),
        z.literal(''),
        z.null(),
      ]).optional().nullable().transform(val => val === '' ? null : val),
      idType: z.enum([
        IdType.AADHAAR,
        IdType.PASSPORT,
        IdType.DRIVING_LICENSE,
        IdType.VOTER_ID,
        IdType.PAN_CARD,
        IdType.OTHER
      ]),
      idNumber: z.string().min(4, 'ID number must be at least 4 characters').max(50),
      category: z.enum([
        VisitorCategory.GENERAL,
        VisitorCategory.ACADEMIC,
        VisitorCategory.GOVERNMENT,
        VisitorCategory.VIP,
        VisitorCategory.CONTRACTOR,
        VisitorCategory.VENDOR,
        VisitorCategory.PARENT,
        VisitorCategory.MEDICAL
      ]).default(VisitorCategory.GENERAL),
    }),

    // Pass details
    passType: z.enum([
      PassType.VISITOR,
      PassType.HOSTEL_GUEST,
      PassType.VEHICLE,
      PassType.EVENT,
      PassType.CONTRACTOR,
      PassType.PARENT
    ]),
    purpose: z.string().min(5, 'Purpose must describe access needs in at least 5 characters').max(500),
    notes: z.union([z.string().max(500), z.null()]).optional().nullable().transform(val => val === '' ? null : val),
    createdByName: z.union([z.string().max(100), z.null()]).optional().nullable().transform(val => val === '' ? null : val),
    creatorDept: z.union([z.string().max(100), z.null()]).optional().nullable().transform(val => val === '' ? null : val),
    comingFrom: z.union([z.string().max(100), z.null()]).optional().nullable().transform(val => val === '' ? null : val),
    validFrom: z.string().refine(val => !isNaN(Date.parse(val)), 'Invalid validFrom date format'),
    validTo: z.string().refine(val => !isNaN(Date.parse(val)), 'Invalid validTo date format'),
    allowedGates: z.union([
      z.array(z.string()).min(1, 'At least one allowed gate must be configured'),
      z.string().min(1).transform(val => [val]), // Handle single gate as string
    ]),
    isMultiEntry: coerceBoolean,
    eventId: z.union([z.string().uuid('Invalid event ID'), z.null(), z.literal('')]).optional().nullable().transform(val => val === '' ? null : val),

    // Vehicle details (conditional for PassType.VEHICLE)
    vehicleDetails: z.object({
      numberPlate: z.string().min(3, 'Invalid license plate number').max(20),
      vehicleType: z.enum([
        VehicleType.TWO_WHEELER,
        VehicleType.FOUR_WHEELER,
        VehicleType.TRUCK,
        VehicleType.BUS,
        VehicleType.OTHER
      ]),
      make: z.union([z.string(), z.null()]).optional().nullable().transform(val => val === '' ? null : val),
      model: z.union([z.string(), z.null()]).optional().nullable().transform(val => val === '' ? null : val),
      color: z.union([z.string(), z.null()]).optional().nullable().transform(val => val === '' ? null : val),
      driverName: z.string().min(2, 'Driver name required'),
      driverPhone: z.string().regex(VALIDATION_RULES.PHONE_REGEX, 'Driver phone must be in E.164 format'),
    }).optional().nullable(),

    // Hostel details (conditional for PassType.HOSTEL_GUEST)
    hostelDetails: z.object({
      hostelBlock: z.string().min(1, 'Hostel block is required'),
      roomNumber: z.string().min(1, 'Room number is required'),
      plannedNights: z.union([
        z.number().int().min(1, 'Planned stay must be at least 1 night').max(15, 'Maximum stay is 15 nights'),
        z.string().regex(/^\d+$/).transform(val => parseInt(val, 10)),
      ]),
      wardenId: z.string().min(1, 'Warden ID is required'), // Accept any non-empty string, not just UUID
    }).optional().nullable(),
  })
  .refine(data => Date.parse(data.validFrom) < Date.parse(data.validTo), {
    message: 'validFrom date must be earlier than validTo date',
    path: ['validTo'],
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const approvePassSchema = z.object({
  body: z.object({
    approved: z.boolean(),
    remarks: z.union([z.string().max(250, 'Remarks must not exceed 250 characters'), z.null()]).optional().nullable(),
  }),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid('Invalid pass ID'),
  }),
});

export const revokePassSchema = z.object({
  body: z.object({
    reason: z.string().min(2, 'Revocation reason must describe cause in at least 2 characters').max(250),
  }),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid('Invalid pass ID'),
  }),
});

export const getPassSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid('Invalid pass ID'),
  }),
});

export const searchPassQuerySchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    page: z.string().regex(/^\d+$/).optional().transform(v => parseInt(v || '1', 10)),
    limit: z.string().regex(/^\d+$/).optional().transform(v => parseInt(v || '20', 10)),
    search: z.string().optional(),
    status: z.string().optional(),
    passType: z.string().optional(),
  }),
  params: z.object({}).optional(),
});
