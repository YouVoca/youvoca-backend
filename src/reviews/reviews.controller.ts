import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/types/auth-user.type';
import { CreateReviewDto } from './dto/create-review.dto';
import { ListReviewCardsDto } from './dto/list-review-cards.dto';
import { ReviewsService } from './reviews.service';

@Controller('reviews')
@UseGuards(JwtAuthGuard)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('cards')
  findCards(@CurrentUser() user: AuthUser, @Query() query: ListReviewCardsDto) {
    return this.reviewsService.findCards(user.id, query.limit);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(user.id, dto.vocabularyId, dto.result);
  }
}
