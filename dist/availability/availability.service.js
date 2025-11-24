"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AvailabilityService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let AvailabilityService = class AvailabilityService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(doctorId, dto) {
        const dateObj = new Date(dto.date);
        const exists = await this.prisma.doctorAvailability.findFirst({
            where: { doctorId, date: dateObj },
        });
        if (exists) {
            throw new common_1.ConflictException('Availability already exists for this date');
        }
        return this.prisma.doctorAvailability.create({
            data: {
                doctorId,
                date: dateObj,
                session_start: new Date(dto.session_start),
                session_end: new Date(dto.session_end),
                slot_duration_min: dto.slot_duration_min ?? null,
                patients_per_slot: dto.patients_per_slot ?? null,
            },
        });
    }
    async findByDoctorAndDate(doctorId, date) {
        const dateObj = new Date(date);
        return this.prisma.doctorAvailability.findMany({
            where: { doctorId, date: dateObj },
            include: { appointments: true },
        });
    }
    async update(id, dto) {
        const availability = await this.prisma.doctorAvailability.findUnique({
            where: { id },
        });
        if (!availability) {
            throw new common_1.NotFoundException('Availability not found');
        }
        const hasAppointment = await this.prisma.appointment.findFirst({
            where: { availabilityId: id, status: 'booked' },
        });
        if (hasAppointment) {
            throw new common_1.ConflictException('Cannot update availability because appointments are booked');
        }
        return this.prisma.doctorAvailability.update({
            where: { id },
            data: {
                session_start: dto.session_start ? new Date(dto.session_start) : undefined,
                session_end: dto.session_end ? new Date(dto.session_end) : undefined,
                slot_duration_min: dto.slot_duration_min ?? undefined,
                patients_per_slot: dto.patients_per_slot ?? undefined,
            },
        });
    }
    async delete(id) {
        const exists = await this.prisma.doctorAvailability.findUnique({
            where: { id },
        });
        if (!exists) {
            throw new common_1.NotFoundException('Availability not found');
        }
        return this.prisma.doctorAvailability.delete({
            where: { id },
        });
    }
};
exports.AvailabilityService = AvailabilityService;
exports.AvailabilityService = AvailabilityService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AvailabilityService);
//# sourceMappingURL=availability.service.js.map