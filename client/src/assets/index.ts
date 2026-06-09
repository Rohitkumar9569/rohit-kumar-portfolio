import googleLogo from './media/photos/google-logo.svg';
import microsoftLogo from './media/photos/microsoft-logo.svg';
import ibmLogo from './media/photos/ibm-logo.svg';
import deeplearningAiLogo from './media/photos/deeplearning-ai-logo.svg';
import umichLogo from './media/photos/umich-logo.svg';
import profilePhoto from './media/photos/profile-photo.webp';
import gkvLogo from './media/photos/gkv-logo.webp';
import roomRadarPreview from './media/photos/roomradar-preview.webp';
import mockpanel from './media/photos/mockpanel.webp';
import studyHubPreview from './media/photos/studyhub-preview.png';

import { ICON_ASSETS, ICON_ASSET_BY_KEY, getIconAsset } from './media/icons';

export const brandLogos = {
  google: googleLogo,
  microsoft: microsoftLogo,
  ibm: ibmLogo,
  deeplearningAi: deeplearningAiLogo,
  umich: umichLogo,
  gkv: gkvLogo,
};

export const photoAssets = {
  profilePhoto,
  roomRadarPreview,
  mockpanel,
  studyHubPreview,
};

export const projectImages = {
  roomRadarPreview,
  mockpanel,
  studyHubPreview,
};

export const ASSETS = {
  logos: brandLogos,
  photos: photoAssets,
  icons: ICON_ASSETS,
  iconMap: ICON_ASSET_BY_KEY,
  getIconAsset,
};

export { ICON_ASSETS, ICON_ASSET_BY_KEY, getIconAsset };

export default ASSETS;
