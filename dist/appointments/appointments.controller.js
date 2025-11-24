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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppointmentsController = void 0;
const common_1 = require("@nestjs/common");
const appointments_service_1 = require("./appointments.service");
let AppointmentsController = class AppointmentsController {
    apptService;
    constructor(apptService) {
        this.apptService = apptService;
    }
    create(doctorId, patientId, dto) {
        return this.apptService.create(Number(doctorId), Number(patientId), dto);
    }
    getPatientAppointments(id) {
        return this.apptService.getPatientAppointments(Number(id));
    }
    getDoctorAppointments(id) {
        return this.apptService.getDoctorAppointments(Number(id));
    }
    cancel(id) {
        return this.apptService.cancelAppointment(Number(id));
    }
    move(id, body) {
        if (!body?.newStart)
            throw new common_1.BadRequestException('newStart required');
        return this.apptService.moveAppointment(Number(id), new Date(body.newStart));
    }
    adjustSession(id, body) {
        return this.apptService.adjustSession(Number(id), body);
    }
};
exports.AppointmentsController = AppointmentsController;
__decorate([
    (0, common_1.Post)(':doctorId/:patientId'),
    __param(0, (0, common_1.Param)('doctorId')),
    __param(1, (0, common_1.Param)('patientId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], AppointmentsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('patient/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AppointmentsController.prototype, "getPatientAppointments", null);
__decorate([
    (0, common_1.Get)('doctor/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AppointmentsController.prototype, "getDoctorAppointments", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AppointmentsController.prototype, "cancel", null);
__decorate([
    (0, common_1.Post)(':id/move'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AppointmentsController.prototype, "move", null);
__decorate([
    (0, common_1.Post)('session/:id/adjust'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AppointmentsController.prototype, "adjustSession", null);
exports.AppointmentsController = AppointmentsController = __decorate([
    (0, common_1.Controller)('appointments'),
    __metadata("design:paramtypes", [appointments_service_1.AppointmentsService])
], AppointmentsController);
//# sourceMappingURL=appointments.controller.js.map