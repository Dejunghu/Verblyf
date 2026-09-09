import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum moet YYYY-MM-DD zijn');

export const searchSchema = z
  .object({
    destination: z.string().min(2, 'Vul een bestemming in').max(80),
    checkIn: isoDate,
    checkOut: isoDate,
    adults: z.coerce.number().int().min(1).max(8).default(2),
    children: z.coerce.number().int().min(0).max(6).default(0),
    rooms: z.coerce.number().int().min(1).max(5).default(1),
    currency: z.enum(['EUR', 'USD', 'GBP']).default('EUR'),
  })
  .refine((v) => new Date(v.checkOut) > new Date(v.checkIn), {
    message: 'Uitchecken moet na inchecken liggen',
    path: ['checkOut'],
  })
  .refine((v) => new Date(v.checkIn) >= new Date(new Date().toDateString()), {
    message: 'Inchecken kan niet in het verleden liggen',
    path: ['checkIn'],
  })
  .refine(
    (v) => (new Date(v.checkOut).getTime() - new Date(v.checkIn).getTime()) / 86_400_000 <= 30,
    { message: 'Maximaal 30 nachten per boeking', path: ['checkOut'] },
  );

export const guestSchema = z.object({
  firstName: z.string().min(1, 'Voornaam is verplicht').max(60),
  lastName: z.string().min(1, 'Achternaam is verplicht').max(60),
  email: z.string().email('Ongeldig e-mailadres'),
  phone: z.string().min(6, 'Telefoonnummer is verplicht').max(24),
  countryCode: z.string().length(2).default('NL'),
});

export const checkoutSchema = z.object({
  offerId: z.string().min(3),
  hotelId: z.string().min(3),
  guest: guestSchema,
  specialRequests: z.string().max(500).optional(),
  search: searchSchema,
});

export type SearchInput = z.infer<typeof searchSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
