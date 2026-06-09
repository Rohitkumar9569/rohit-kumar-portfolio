import API from './api';

export interface StudyWorkspacePhase {
  key: string;
  label: string;
  order: number;
}

export interface StudyWorkspaceTemplate {
  phases?: StudyWorkspacePhase[];
  resourceTypes?: string[];
}

export interface StudyWorkspace {
  _id: string;
  name: string;
  shortName?: string;
  slug: string;
  type: 'exam' | 'school' | 'college' | 'placement' | 'personal';
  category?: string;
  description?: string;
  status: 'active' | 'coming_soon' | 'info_only' | 'archive';
  readiness?: number;
  template?: StudyWorkspaceTemplate;
}

export interface StudyResourceWorkspace {
  _id: string;
  name: string;
  shortName?: string;
  slug: string;
  type: string;
}

export interface StudyResource {
  _id: string;
  title: string;
  slug: string;
  summary?: string;
  type: 'pyq' | 'notes' | 'material' | 'book' | 'syllabus' | 'qa' | 'practice' | 'update' | 'assignment';
  subject?: string;
  topic?: string;
  year?: number;
  language: 'hinglish' | 'english' | 'hindi' | 'mixed';
  sourceType: string;
  sourceName?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  tags?: string[];
  facets?: Record<string, string>;
  syllabusNodes?: string[];
  fileUrl?: string;
  content?: string;
  externalLinks?: Array<{
    label: string;
    url: string;
  }>;
  isFeatured?: boolean;
  updatedFor?: string;
  primaryWorkspaceId?: StudyResourceWorkspace;
}

export interface StudyCardFile {
  _id: string;
  name: string;
  url: string;
  thumbnailUrl?: string;
  sizeBytes?: number;
  mimeType?: string;
  publicId?: string;
  resourceType?: string;
  status?: StudyCard['status'];
  visibility?: StudyCard['visibility'];
  year?: number;
  stage?: string;
  paper?: string;
  subject?: string;
  topic?: string;
  language?: StudyResource['language'];
  sourceType?: string;
  sourceName?: string;
  notes?: string;
  uploadedAt?: string;
}

export interface StudyCard {
  _id: string;
  workspaceId: string | StudyResourceWorkspace;
  parentId?: string | null;
  pathNames?: string[];
  name: string;
  slug: string;
  iconKey: string;
  iconUrl?: string;
  goalType?: 'library_root' | 'exam_category' | 'exam_family' | 'exam' | 'board' | 'class' | 'subject' | 'resource_folder';
  tone: 'blue' | 'violet' | 'emerald' | 'amber' | 'rose' | 'cyan' | 'indigo' | 'slate';
  order: number;
  childCount?: number;
  fileCount?: number;
  status: 'published' | 'draft' | 'archived';
  visibility: 'public' | 'private' | 'invite_only';
  files: StudyCardFile[];
}

export interface StudyResourceListResponse {
  page: number;
  limit: number;
  resources: StudyResource[];
}

export interface StudyIconAsset {
  _id: string;
  key: string;
  label: string;
  url: string;
  publicId?: string;
  resourceType?: string;
  createdAt?: string;
}

export interface StudySearchResponse {
  resources: StudyResource[];
}

interface WorkspaceParams {
  type?: string;
  status?: string;
  q?: string;
  limit?: number;
}

interface ResourceParams {
  q?: string;
  workspace?: string;
  type?: string;
  subject?: string;
  language?: string;
  stage?: string;
  paper?: string;
  year?: number;
  limit?: number;
}

interface AdminResourceParams {
  q?: string;
  workspace?: string;
  status?: string;
  limit?: number;
}

interface StudyCardParams {
  workspace: string;
  parent?: string;
  summary?: boolean;
}

export const STUDY_QUERY_STALE_TIME_MS = 1000 * 60 * 15;
export const STUDY_QUERY_GC_TIME_MS = 1000 * 60 * 60;

export const studyCardQueryKey = (workspace: string, parent = 'root') =>
  ['study-cards', workspace, parent || 'root'] as const;

export const studyCardDetailQueryKey = (id: string) => ['study-card', id] as const;

export interface StudyResourceRequestPayload {
  title: string;
  workspaceSlug?: string;
  resourceType?: StudyResource['type'];
  subject?: string;
  message?: string;
  sourceUrl?: string;
}

export interface StudyResourceRequest {
  _id: string;
  title: string;
  workspaceId?: StudyResourceWorkspace | string;
  resourceType?: StudyResource['type'] | string;
  subject?: string;
  message?: string;
  sourceUrl?: string;
  requester?: {
    _id: string;
    name?: string;
    email?: string;
    role?: string;
    authProvider?: string;
  } | string;
  status: 'open' | 'planned' | 'fulfilled' | 'rejected';
  voteCount: number;
  createdAt?: string;
  updatedAt?: string;
}

interface AdminRequestParams {
  q?: string;
  workspace?: string;
  status?: 'all' | StudyResourceRequest['status'];
  limit?: number;
}

export interface StudyWorkspacePayload {
  name: string;
  shortName?: string;
  slug: string;
  type: StudyWorkspace['type'];
  category?: string;
  description?: string;
  visibility?: 'public' | 'private' | 'invite_only';
  status?: StudyWorkspace['status'];
  priority?: number;
  readiness?: number;
  phases?: string[];
  resourceTypes?: StudyResource['type'][];
}

export interface StudyResourcePayload {
  title: string;
  slug: string;
  summary?: string;
  type: StudyResource['type'];
  status?: 'published' | 'draft' | 'pending' | 'archived';
  visibility?: 'public' | 'private' | 'invite_only';
  primaryWorkspaceSlug: string;
  workspaceSlugs?: string[];
  subject?: string;
  topic?: string;
  year?: number;
  language?: StudyResource['language'];
  sourceType?: string;
  sourceName?: string;
  difficulty?: StudyResource['difficulty'];
  tags?: string[];
  syllabusNodes?: string[];
  fileUrl?: string;
  content?: string;
  isFeatured?: boolean;
  updatedFor?: string;
  stage?: string;
  paper?: string;
  class?: string;
  semester?: string;
  stream?: string;
  company?: string;
}

export interface StudyCardPayload {
  workspaceSlug: string;
  parentId?: string | null;
  name: string;
  slug?: string;
  iconKey?: string;
  iconUrl?: string;
  goalType?: StudyCard['goalType'];
  tone?: StudyCard['tone'];
  order?: number;
  status?: StudyCard['status'];
  visibility?: StudyCard['visibility'];
}

export interface StudyCardFileMetadataPayload {
  name?: string;
  status?: StudyCard['status'];
  visibility?: StudyCard['visibility'];
  year?: number | string;
  stage?: string;
  paper?: string;
  subject?: string;
  topic?: string;
  language?: StudyResource['language'];
  sourceType?: string;
  sourceName?: string;
  notes?: string;
}

export interface AdminKitAiSuggestion {
  title: string;
  category: string;
  body: string;
  examName: string;
  description: string;
  summary: string;
  paths: string[][];
  notes: string[];
  gaps: string[];
  existingMatches: string[];
  confidence: number;
  sourceMode: 'ai' | 'fallback';
  generatedAt?: string;
}

export interface AdminLibraryAiSuggestion {
  action?: string;
  type: string;
  targetKind?: 'folder' | 'pdf' | 'library' | string;
  title: string;
  targetPath: string;
  proposedPath: string;
  newName?: string;
  status?: StudyCard['status'];
  visibility?: StudyCard['visibility'];
  metadata?: StudyCardFileMetadataPayload;
  reason: string;
  risk: string;
  confidence: number;
}

export interface AdminLibraryAiAudit {
  summary: string;
  suggestions: AdminLibraryAiSuggestion[];
  sourceMode: 'ai' | 'fallback';
  generatedAt?: string;
}

export interface AdminNcertPrepareResult {
  message: string;
  completeBooks: number;
  renamedBooks: number;
  metadataUpdated: number;
  archivedChapterFiles: number;
  mirroredBooks: number;
  mirrorSkipped: number;
  warmQueued: number;
  warmStarted: boolean;
  cacheReady: number;
  warming: boolean;
  generatedAt?: string;
}

export const fetchStudyWorkspaces = async (params: WorkspaceParams = {}) => {
  const { data } = await API.get<StudyWorkspace[]>('/api/study/workspaces', { params });
  return data;
};

export const fetchStudyWorkspace = async (slug: string) => {
  const { data } = await API.get<StudyWorkspace>(`/api/study/workspaces/${encodeURIComponent(slug)}`);
  return data;
};

export const fetchStudyResources = async (params: ResourceParams = {}) => {
  const { data } = await API.get<StudyResourceListResponse>('/api/study/resources', { params });
  return data.resources;
};

export const fetchStudyResource = async (slug: string) => {
  const { data } = await API.get<StudyResource>(`/api/study/resources/${encodeURIComponent(slug)}`);
  return data;
};

export const searchStudyResources = async (params: ResourceParams = {}) => {
  const { data } = await API.get<StudySearchResponse>('/api/study/search', { params });
  return data.resources;
};

export const fetchStudyCards = async (params: StudyCardParams) => {
  const { data } = await API.get<StudyCard[]>('/api/study/cards', { params });
  return data;
};

export const fetchStudyCard = async (id: string) => {
  const { data } = await API.get<StudyCard>(`/api/study/cards/${encodeURIComponent(id)}`);
  return data;
};

export const searchStudyCards = async (params: { q?: string; workspace?: string; limit?: number } = {}) => {
  const { data } = await API.get<StudyCard[]>('/api/study/cards/search', { params });
  return data;
};

export const createStudyResourceRequest = async (payload: StudyResourceRequestPayload) => {
  const { data } = await API.post('/api/study/requests', payload);
  return data;
};

export const fetchAdminStudyRequests = async (params: AdminRequestParams = {}) => {
  const { data } = await API.get<StudyResourceRequest[]>('/api/study/admin/requests', { params });
  return data;
};

export const updateAdminStudyRequest = async (
  id: string,
  payload: { status: StudyResourceRequest['status'] }
) => {
  const { data } = await API.put<StudyResourceRequest>(`/api/study/admin/requests/${encodeURIComponent(id)}`, payload);
  return data;
};

export const fetchAdminStudyResources = async (params: AdminResourceParams = {}) => {
  const { data } = await API.get<StudyResource[]>('/api/study/admin/resources', { params });
  return data;
};

export const fetchAdminStudyCards = async (params: StudyCardParams) => {
  const { data } = await API.get<StudyCard[]>('/api/study/admin/cards', { params });
  return data;
};

export const fetchAdminStudyCard = async (id: string) => {
  const { data } = await API.get<StudyCard>(`/api/study/admin/cards/${encodeURIComponent(id)}`);
  return data;
};

export const fetchAdminStudyIcons = async () => {
  const { data } = await API.get<StudyIconAsset[]>('/api/study/admin/icons');
  return data;
};

export const uploadAdminStudyIcon = async (label: string, file: File) => {
  const formData = new FormData();
  formData.append('label', label);
  formData.append('file', file);
  const { data } = await API.post<StudyIconAsset>('/api/study/admin/icons', formData);
  return data;
};

export const deleteAdminStudyIcon = async (id: string) => {
  const { data } = await API.delete(`/api/study/admin/icons/${encodeURIComponent(id)}`);
  return data;
};

export const createAdminStudyCard = async (payload: StudyCardPayload) => {
  const { data } = await API.post<StudyCard>('/api/study/admin/cards', payload);
  return data;
};

export const updateAdminStudyCard = async (id: string, payload: StudyCardPayload) => {
  const { data } = await API.put<StudyCard>(`/api/study/admin/cards/${encodeURIComponent(id)}`, payload);
  return data;
};

export const updateAdminStudyCardPublication = async (
  id: string,
  payload: { action: 'publish' | 'draft' | 'unpublish'; cascade?: boolean }
) => {
  const { data } = await API.patch<{ card: StudyCard; affectedCards: number; message: string }>(
    `/api/study/admin/cards/${encodeURIComponent(id)}/publication`,
    payload
  );
  return data;
};

export const deleteAdminStudyCard = async (id: string) => {
  const { data } = await API.delete(`/api/study/admin/cards/${encodeURIComponent(id)}`);
  return data;
};

export const uploadAdminStudyCardFiles = async (
  cardId: string,
  files: File[],
  fileNames: string[] = [],
  metadata: StudyCardFileMetadataPayload[] | StudyCardFileMetadataPayload = []
) => {
  const formData = new FormData();
  const metadataList = Array.isArray(metadata) ? metadata : files.map(() => metadata);
  files.forEach((file, index) => {
    const itemMetadata = metadataList[index] || {};
    formData.append('files', file);
    formData.append('fileNames', itemMetadata.name || fileNames[index] || '');
    if (itemMetadata.status) formData.append('statuses', itemMetadata.status);
    if (itemMetadata.visibility) formData.append('visibilities', itemMetadata.visibility);
    if (itemMetadata.year) formData.append('years', String(itemMetadata.year));
    if (itemMetadata.stage) formData.append('stages', itemMetadata.stage);
    if (itemMetadata.paper) formData.append('papers', itemMetadata.paper);
    if (itemMetadata.subject) formData.append('subjects', itemMetadata.subject);
    if (itemMetadata.topic) formData.append('topics', itemMetadata.topic);
    if (itemMetadata.language) formData.append('languages', itemMetadata.language);
    if (itemMetadata.sourceType) formData.append('sourceTypes', itemMetadata.sourceType);
    if (itemMetadata.sourceName) formData.append('sourceNames', itemMetadata.sourceName);
    if (itemMetadata.notes) formData.append('notes', itemMetadata.notes);
    if ((itemMetadata as any).premium !== undefined) formData.append('premiums', String((itemMetadata as any).premium));
  });
  const { data } = await API.post<StudyCard>(`/api/study/admin/cards/${encodeURIComponent(cardId)}/files`, formData);
  return data;
};

export const deleteAdminStudyCardFile = async (cardId: string, fileId: string) => {
  const { data } = await API.delete(`/api/study/admin/cards/${encodeURIComponent(cardId)}/files/${encodeURIComponent(fileId)}`);
  return data;
};

export const updateAdminStudyCardFile = async (
  cardId: string,
  fileId: string,
  payload: string | StudyCardFileMetadataPayload,
  file?: File | null
) => {
  const formData = new FormData();
  const metadata = typeof payload === 'string' ? { name: payload } : payload;
  Object.entries(metadata).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') formData.append(key, String(value));
  });
  if (file) formData.append('file', file);

  const { data } = await API.put<StudyCard>(
    `/api/study/admin/cards/${encodeURIComponent(cardId)}/files/${encodeURIComponent(fileId)}`,
    formData
  );
  return data;
};

export const moveAdminStudyCardFile = async (cardId: string, fileId: string, targetCardId: string) => {
  const { data } = await API.post<StudyCard>(
    `/api/study/admin/cards/${encodeURIComponent(cardId)}/files/${encodeURIComponent(fileId)}/move`,
    { targetCardId }
  );
  return data;
};

export const copyAdminStudyCard = async (cardId: string, targetParentId?: string | null) => {
  const { data } = await API.post<StudyCard>(
    `/api/study/admin/cards/${encodeURIComponent(cardId)}/duplicate`,
    { targetParentId: targetParentId || null }
  );
  return data;
};

export const copyAdminStudyCardFile = async (cardId: string, fileId: string, targetCardId: string) => {
  const { data } = await API.post<StudyCard>(
    `/api/study/admin/cards/${encodeURIComponent(cardId)}/files/${encodeURIComponent(fileId)}/copy`,
    { targetCardId }
  );
  return data;
};

export const researchAdminKitWithAi = async (payload: {
  examName: string;
  depth?: 'standard' | 'deep';
  instruction?: string;
  existingTemplate?: {
    name?: string;
    category?: string;
    body?: string;
    examName?: string;
    description?: string;
    paths?: string[][];
  };
}) => {
  const { data } = await API.post<AdminKitAiSuggestion>('/api/study/admin/ai/kits/research', payload);
  return data;
};

export const auditAdminStudyLibraryWithAi = async (payload: {
  focusPath?: string;
} = {}) => {
  const { data } = await API.post<AdminLibraryAiAudit>('/api/study/admin/ai/library/audit', payload);
  return data;
};

export const prepareAdminNcertBooks = async (payload: { warmLimit?: number; mirrorToCloudinary?: boolean; mirrorLimit?: number } = {}) => {
  const { data } = await API.post<AdminNcertPrepareResult>('/api/study/admin/ncert/prepare-books', payload);
  return data;
};

export const createAdminStudyResource = async (payload: StudyResourcePayload) => {
  const { data } = await API.post<StudyResource>('/api/study/admin/resources', payload);
  return data;
};

export const updateAdminStudyResource = async (id: string, payload: StudyResourcePayload) => {
  const { data } = await API.put<StudyResource>(`/api/study/admin/resources/${encodeURIComponent(id)}`, payload);
  return data;
};

export const deleteAdminStudyResource = async (id: string) => {
  const { data } = await API.delete(`/api/study/admin/resources/${encodeURIComponent(id)}`);
  return data;
};

export const createAdminStudyWorkspace = async (payload: StudyWorkspacePayload) => {
  const { data } = await API.post<StudyWorkspace>('/api/study/admin/workspaces', payload);
  return data;
};

export const updateAdminStudyWorkspace = async (id: string, payload: StudyWorkspacePayload) => {
  const { data } = await API.put<StudyWorkspace>(`/api/study/admin/workspaces/${encodeURIComponent(id)}`, payload);
  return data;
};
