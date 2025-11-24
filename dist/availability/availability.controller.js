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
exports.AvailabilityController = void 0;
const common_1 = require("@nestjs/common");
const availability_service_1 = require("./availability.service");
let AvailabilityController = class AvailabilityController {
    availabilityService;
    constructor(availabilityService) {
        this.availabilityService = availabilityService;
    }
    create(doctorId, dto) {
        return this.availabilityService.create(Number(doctorId), dto);
    }
    getByDoctorAndDate(doctorId, date) {
        return this.availabilityService.findByDoctorAndDate(Number(doctorId), date);
    }
    update(id, dto) {
        return this.availabilityService.update(Number(id), dto);
    }
    delete(id) {
        return this.availabilityService.delete(Number(id));
    }
};
exports.AvailabilityController = AvailabilityController;
__decorate([
    (0, common_1.Post)(':doctorId'),
    __param(0, (0, common_1.Param)('doctorId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AvailabilityController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(':doctorId/:date'),
    __param(0, (0, common_1.Param)('doctorId')),
    __param(1, (0, common_1.Param)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AvailabilityController.prototype, "getByDoctorAndDate", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AvailabilityController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AvailabilityController.prototype, "delete", null);
exports.AvailabilityController = AvailabilityController = __decorate([
    (0, common_1.Controller)('availability'),
    __metadata("design:paramtypes", [availability_service_1.AvailabilityService])
], AvailabilityController);
//# sourceMappingURL=availability.controller.js.map