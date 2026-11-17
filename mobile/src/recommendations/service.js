import { API_BASE_URL } from '../config/api';
import { createRecommendationService } from './transport';

export const loadRecommendations = createRecommendationService({
  baseUrl: API_BASE_URL,
  path: process.env.EXPO_PUBLIC_RECOMMENDATIONS_PATH,
});
