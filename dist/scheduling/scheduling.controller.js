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
exports.SchedulingController = void 0;
const common_1 = require("@nestjs/common");
const scheduling_service_1 = require("./scheduling.service");
let SchedulingController = class SchedulingController {
    schedulingService;
    constructor(schedulingService) {
        this.schedulingService = schedulingService;
    }
    async adjustSession(id, body) {
        const sessionId = Number(id);
        if (body.action === 'expand') {
            return this.schedulingService.expandSession({
                sessionId,
                newStart: body.newStart,
                newEnd: body.newEnd,
                strategy: body.strategy,
                userId: body.userId,
            });
        }
        if (body.action === 'shrink') {
            return this.schedulingService.shrinkSession({
                sessionId,
                newStart: body.newStart,
                newEnd: body.newEnd,
                strategy: body.strategy,
                allowCompress: body.allowCompress ?? false,
                targetSlotDuration: body.targetSlotDuration ?? 10,
                userId: body.userId,
            });
        }
        return { error: 'Invalid action' };
    }
};
exports.SchedulingController = SchedulingController;
__decorate([
    (0, common_1.Post)(':id/adjust'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SchedulingController.prototype, "adjustSession", null);
exports.SchedulingController = SchedulingController = __decorate([
    (0, common_1.Controller)('scheduling/session'),
    __metadata("design:paramtypes", [scheduling_service_1.SchedulingService])
], SchedulingController);
//# sourceMappingURL=scheduling.controller.js.map