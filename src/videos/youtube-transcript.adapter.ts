import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  fetchTranscript,
  YoutubeTranscriptDisabledError,
  YoutubeTranscriptInvalidLangError,
  YoutubeTranscriptInvalidVideoIdError,
  YoutubeTranscriptNotAvailableError,
  YoutubeTranscriptNotAvailableLanguageError,
  YoutubeTranscriptTooManyRequestError,
  YoutubeTranscriptVideoUnavailableError,
} from 'youtube-transcript-plus';
import { decode } from 'he';

@Injectable()
export class YoutubeTranscriptAdapter {
  async fetch(videoId: string, language: string) {
    try {
      const result = await fetchTranscript(videoId, {
        lang: language,
        videoDetails: true,
        retries: 2,
        retryDelay: 500,
      });
      return {
        ...result,
        videoDetails: {
          ...result.videoDetails,
          title: decode(result.videoDetails.title),
        },
        segments: result.segments.map((segment) => ({
          ...segment,
          text: decode(segment.text),
        })),
      };
    } catch (error) {
      if (error instanceof YoutubeTranscriptInvalidVideoIdError) {
        throw new BadRequestException('유효하지 않은 YouTube URL입니다.');
      }
      if (error instanceof YoutubeTranscriptInvalidLangError) {
        throw new BadRequestException('유효하지 않은 자막 언어 코드입니다.');
      }
      if (
        error instanceof YoutubeTranscriptDisabledError ||
        error instanceof YoutubeTranscriptNotAvailableError ||
        error instanceof YoutubeTranscriptNotAvailableLanguageError ||
        error instanceof YoutubeTranscriptVideoUnavailableError
      ) {
        throw new UnprocessableEntityException(
          '요청한 영상에서 해당 언어의 자막을 가져올 수 없습니다.',
        );
      }
      if (error instanceof YoutubeTranscriptTooManyRequestError) {
        throw new ServiceUnavailableException(
          'YouTube 요청이 일시적으로 제한되었습니다. 잠시 후 다시 시도해 주세요.',
        );
      }
      throw new ServiceUnavailableException(
        'YouTube 자막 서비스에 연결할 수 없습니다.',
      );
    }
  }
}
