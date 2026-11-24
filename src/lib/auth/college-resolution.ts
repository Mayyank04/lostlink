export {
  resolveCollegeFromEmail,
  extractDomainFromEmail,
  isPublicEmailProvider,
  isValidEducationalEmail,
  PUBLIC_EMAIL_PROVIDERS,
} from '@/lib/college/resolve-college';

export type {
  CollegeResolutionResult,
  CollegeResolutionSuccess,
  CollegeResolutionFailure,
} from '@/lib/college/resolve-college';
