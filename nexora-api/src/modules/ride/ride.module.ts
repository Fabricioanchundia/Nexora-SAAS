import { Module } from '@nestjs/common';
import { RideService } from './ride.service';

@Module({
    providers: [RideService],
    exports: [RideService],
})
export class RideModule {}
