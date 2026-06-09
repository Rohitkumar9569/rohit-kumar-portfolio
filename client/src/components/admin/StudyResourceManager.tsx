import { type FormEvent, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createAdminStudyResource,
  createAdminStudyWorkspace,
  deleteAdminStudyResource,
  fetchAdminStudyResources,
  fetchStudyWorkspaces,
  updateAdminStudyResource,
  updateAdminStudyWorkspace,
  type StudyResource,
  type StudyResourcePayload,
  type StudyWorkspace,
  type StudyWorkspacePayload,
} from '../../studyHubApi';

const resourceTypes: Array<{ value: StudyResource['type']; label: string }> = [
  { value: 'pyq', label: 'PYQ' },
  { value: 'notes', label: 'Notes' },
  { value: 'material', label: 'Study Material' },
  { value: 'book', label: 'Book' },
  { value: 'syllabus', label: 'Syllabus' },
  { value: 'qa', label: 'Q&A' },
  { value: 'practice', label: 'Practice' },
  { value: 'update', label: 'Update' },
  { value: 'assignment', label: 'Assignment' },
];

const workspaceTypes: Array<{ value: StudyWorkspace['type']; label: string }> = [
  { value: 'exam', label: 'Exam' },
  { value: 'school', label: 'School' },
  { value: 'college', label: 'College' },
  { value: 'placement', label: 'Placement' },
  { value: 'personal', label: 'Personal' },
];

const resourceStatuses: Array<NonNullable<StudyResourcePayload['status']>> = ['draft', 'published', 'pending', 'archived'];
const workspaceStatuses: Array<StudyWorkspace['status']> = ['active', 'coming_soon', 'info_only', 'archive'];
const languages: Array<StudyResource['language']> = ['hinglish', 'english', 'hindi', 'mixed'];
const sourceTypes = ['official', 'ncert', 'standard_book', 'faculty', 'creator', 'community', 'platform'];

const defaultResourceForm: StudyResourcePayload = {
  title: '',
  slug: '',
  summary: '',
  type: 'notes',
  status: 'draft',
  visibility: 'public',
  primaryWorkspaceSlug: '',
  workspaceSlugs: [],
  subject: '',
  topic: '',
  language: 'hinglish',
  sourceType: 'platform',
  sourceName: '',
  difficulty: undefined,
  tags: [],
  syllabusNodes: [],
  fileUrl: '',
  content: '',
  isFeatured: false,
  updatedFor: '',
  stage: '',
  paper: '',
  class: '',
  semester: '',
  stream: '',
  company: '',
};

const defaultWorkspaceForm: StudyWorkspacePayload = {
  name: '',
  shortName: '',
  slug: '',
  type: 'exam',
  category: '',
  description: '',
  visibility: 'public',
  status: 'coming_soon',
  priority: 0,
  readiness: 0,
  phases: [],
  resourceTypes: ['pyq', 'notes', 'book', 'syllabus', 'qa', 'practice', 'update'],
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const splitList = (value?: string | string[]) => {
  if (Array.isArray(value)) return value;
  return (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const joinList = (value?: string[]) => (value || []).join(', ');

const getResourceWorkspaceSlug = (resource: StudyResource) => resource.primaryWorkspaceId?.slug || '';

const StudyResourceManager = () => {
  const queryClient = useQueryClient();
  const [resourceForm, setResourceForm] = useState<StudyResourcePayload>(defaultResourceForm);
  const [workspaceForm, setWorkspaceForm] = useState<StudyWorkspacePayload>(defaultWorkspaceForm);
  const [editingResourceId, setEditingResourceId] = useState('');
  const [editingWorkspaceId, setEditingWorkspaceId] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [workspaceFilter, setWorkspaceFilter] = useState('');
  const [search, setSearch] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [syllabusInput, setSyllabusInput] = useState('');
  const [workspaceSlugsInput, setWorkspaceSlugsInput] = useState('');
  const [phasesInput, setPhasesInput] = useState('');
  const [resourceTypesInput, setResourceTypesInput] = useState(joinList(defaultWorkspaceForm.resourceTypes));

  const { data: workspaces = [] } = useQuery({
    queryKey: ['admin-study-workspaces'],
    queryFn: () => fetchStudyWorkspaces({ status: 'all', limit: 100 }),
    staleTime: 1000 * 60,
  });

  const { data: resources = [], isLoading: isLoadingResources } = useQuery({
    queryKey: ['admin-study-resources', statusFilter, workspaceFilter, search],
    queryFn: () =>
      fetchAdminStudyResources({
        status: statusFilter,
        workspace: workspaceFilter,
        q: search,
        limit: 120,
      }),
    staleTime: 1000 * 30,
  });

  const workspaceOptions = useMemo(() => workspaces.slice().sort((a, b) => a.name.localeCompare(b.name)), [workspaces]);

  useEffect(() => {
    if (!resourceForm.primaryWorkspaceSlug && workspaceOptions[0]?.slug) {
      setResourceForm((current) => ({ ...current, primaryWorkspaceSlug: workspaceOptions[0].slug }));
    }
  }, [resourceForm.primaryWorkspaceSlug, workspaceOptions]);

  const invalidateCms = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin-study-resources'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-study-workspaces'] }),
      queryClient.invalidateQueries({ queryKey: ['study-workspaces'] }),
      queryClient.invalidateQueries({ queryKey: ['study-resources'] }),
      queryClient.invalidateQueries({ queryKey: ['study-search'] }),
    ]);
  };

  const resetResourceForm = () => {
    setEditingResourceId('');
    setResourceForm({
      ...defaultResourceForm,
      primaryWorkspaceSlug: workspaceOptions[0]?.slug || '',
    });
    setTagsInput('');
    setSyllabusInput('');
    setWorkspaceSlugsInput('');
  };

  const resetWorkspaceForm = () => {
    setEditingWorkspaceId('');
    setWorkspaceForm(defaultWorkspaceForm);
    setPhasesInput('');
    setResourceTypesInput(joinList(defaultWorkspaceForm.resourceTypes));
  };

  const handleResourceChange = (key: keyof StudyResourcePayload, value: string | boolean | number | undefined) => {
    setResourceForm((current) => ({
      ...current,
      [key]: value,
      ...(key === 'title' && !editingResourceId ? { slug: slugify(String(value)) } : {}),
    }));
  };

  const handleWorkspaceChange = (key: keyof StudyWorkspacePayload, value: string | number | undefined) => {
    setWorkspaceForm((current) => ({
      ...current,
      [key]: value,
      ...(key === 'name' && !editingWorkspaceId ? { slug: slugify(String(value)) } : {}),
    }));
  };

  const buildResourcePayload = (): StudyResourcePayload => ({
    ...resourceForm,
    year: resourceForm.year ? Number(resourceForm.year) : undefined,
    tags: splitList(tagsInput),
    syllabusNodes: splitList(syllabusInput),
    workspaceSlugs: splitList(workspaceSlugsInput),
  });

  const handleResourceSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = buildResourcePayload();
    const action = editingResourceId
      ? updateAdminStudyResource(editingResourceId, payload)
      : createAdminStudyResource(payload);

    await toast.promise(action, {
      loading: editingResourceId ? 'Updating resource...' : 'Creating resource...',
      success: editingResourceId ? 'Resource updated' : 'Resource created',
      error: 'Resource save failed',
    });

    resetResourceForm();
    await invalidateCms();
  };

  const handleEditResource = (resource: StudyResource) => {
    setEditingResourceId(resource._id);
    setResourceForm({
      ...defaultResourceForm,
      title: resource.title,
      slug: resource.slug,
      summary: resource.summary || '',
      type: resource.type,
      status: (resource as any).status || 'draft',
      visibility: (resource as any).visibility || 'public',
      primaryWorkspaceSlug: getResourceWorkspaceSlug(resource),
      subject: resource.subject || '',
      topic: resource.topic || '',
      year: resource.year,
      language: resource.language,
      sourceType: resource.sourceType || 'platform',
      sourceName: resource.sourceName || '',
      difficulty: resource.difficulty,
      fileUrl: resource.fileUrl || '',
      content: resource.content || '',
      isFeatured: Boolean(resource.isFeatured),
      updatedFor: resource.updatedFor || '',
      stage: resource.facets?.stage || '',
      paper: resource.facets?.paper || '',
      class: resource.facets?.class || '',
      semester: resource.facets?.semester || '',
      stream: resource.facets?.stream || '',
      company: resource.facets?.company || '',
    });
    setTagsInput(joinList(resource.tags));
    setSyllabusInput(joinList(resource.syllabusNodes));
    setWorkspaceSlugsInput(getResourceWorkspaceSlug(resource));
  };

  const handleDeleteResource = async (resourceId: string) => {
    if (!window.confirm('Delete this Study Hub resource?')) return;

    await toast.promise(deleteAdminStudyResource(resourceId), {
      loading: 'Deleting resource...',
      success: 'Resource deleted',
      error: 'Delete failed',
    });
    await invalidateCms();
  };

  const buildWorkspacePayload = (): StudyWorkspacePayload => ({
    ...workspaceForm,
    priority: Number(workspaceForm.priority || 0),
    readiness: Number(workspaceForm.readiness || 0),
    phases: splitList(phasesInput),
    resourceTypes: splitList(resourceTypesInput) as StudyResource['type'][],
  });

  const handleWorkspaceSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = buildWorkspacePayload();
    const action = editingWorkspaceId
      ? updateAdminStudyWorkspace(editingWorkspaceId, payload)
      : createAdminStudyWorkspace(payload);

    await toast.promise(action, {
      loading: editingWorkspaceId ? 'Updating workspace...' : 'Creating workspace...',
      success: editingWorkspaceId ? 'Workspace updated' : 'Workspace created',
      error: 'Workspace save failed',
    });

    resetWorkspaceForm();
    await invalidateCms();
  };

  const handleEditWorkspace = (workspace: StudyWorkspace) => {
    setEditingWorkspaceId(workspace._id);
    setWorkspaceForm({
      name: workspace.name,
      shortName: workspace.shortName || '',
      slug: workspace.slug,
      type: workspace.type,
      category: workspace.category || '',
      description: workspace.description || '',
      visibility: 'public',
      status: workspace.status,
      priority: (workspace as any).priority || 0,
      readiness: workspace.readiness || 0,
      phases: [],
      resourceTypes: (workspace.template?.resourceTypes || []) as StudyResource['type'][],
    });
    setPhasesInput(joinList(workspace.template?.phases?.map((phase) => phase.label)));
    setResourceTypesInput(joinList((workspace.template?.resourceTypes || []) as StudyResource['type'][]));
  };

  return (
    <section className="rounded-lg bg-slate-800 p-6 shadow-lg">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Study Hub CMS</h2>
          <p className="mt-1 text-sm text-slate-400">
            Manage workspaces, resource metadata, publish status, source badges, and SEO-ready content.
          </p>
        </div>
        <span className="rounded-md bg-cyan-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-cyan-300">
          Workspace + Resource
        </span>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <form onSubmit={handleWorkspaceSubmit} className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-lg font-bold text-white">
              {editingWorkspaceId ? 'Edit workspace' : 'Create workspace'}
            </h3>
            {editingWorkspaceId && (
              <button type="button" onClick={resetWorkspaceForm} className="text-sm font-bold text-slate-400 hover:text-white">
                Cancel
              </button>
            )}
          </div>

          <div className="grid gap-3">
            <input
              value={workspaceForm.name}
              onChange={(event) => handleWorkspaceChange('name', event.target.value)}
              placeholder="Workspace name"
              className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-cyan-500"
              required
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={workspaceForm.shortName || ''}
                onChange={(event) => handleWorkspaceChange('shortName', event.target.value)}
                placeholder="Short name"
                className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-cyan-500"
              />
              <input
                value={workspaceForm.slug}
                onChange={(event) => handleWorkspaceChange('slug', slugify(event.target.value))}
                placeholder="workspace-slug"
                className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-cyan-500"
                required
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                value={workspaceForm.type}
                onChange={(event) => handleWorkspaceChange('type', event.target.value as StudyWorkspacePayload['type'])}
                className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-cyan-500"
              >
                {workspaceTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
              </select>
              <select
                value={workspaceForm.status}
                onChange={(event) => handleWorkspaceChange('status', event.target.value as StudyWorkspacePayload['status'])}
                className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-cyan-500"
              >
                {workspaceStatuses.map((status) => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}
              </select>
            </div>
            <input
              value={workspaceForm.category || ''}
              onChange={(event) => handleWorkspaceChange('category', event.target.value)}
              placeholder="Category: central, state, school, placement"
              className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-cyan-500"
            />
            <textarea
              value={workspaceForm.description || ''}
              onChange={(event) => handleWorkspaceChange('description', event.target.value)}
              placeholder="Workspace description"
              className="min-h-20 rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-cyan-500"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="number"
                value={workspaceForm.readiness || 0}
                onChange={(event) => handleWorkspaceChange('readiness', Number(event.target.value))}
                placeholder="Readiness"
                className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-cyan-500"
              />
              <input
                type="number"
                value={workspaceForm.priority || 0}
                onChange={(event) => handleWorkspaceChange('priority', Number(event.target.value))}
                placeholder="Priority"
                className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-cyan-500"
              />
            </div>
            <input
              value={phasesInput}
              onChange={(event) => setPhasesInput(event.target.value)}
              placeholder="Phases: Foundation, Prelims, Mains"
              className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-cyan-500"
            />
            <input
              value={resourceTypesInput}
              onChange={(event) => setResourceTypesInput(event.target.value)}
              placeholder="Resource types: pyq, notes, book"
              className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-cyan-500"
            />
          </div>

          <button className="mt-4 w-full rounded-md bg-cyan-600 px-4 py-2 font-bold text-white transition hover:bg-cyan-700">
            {editingWorkspaceId ? 'Save Workspace' : 'Create Workspace'}
          </button>
        </form>

        <form onSubmit={handleResourceSubmit} className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-lg font-bold text-white">
              {editingResourceId ? 'Edit resource' : 'Create resource'}
            </h3>
            {editingResourceId && (
              <button type="button" onClick={resetResourceForm} className="text-sm font-bold text-slate-400 hover:text-white">
                Cancel
              </button>
            )}
          </div>

          <div className="grid gap-3">
            <input
              value={resourceForm.title}
              onChange={(event) => handleResourceChange('title', event.target.value)}
              placeholder="Resource title"
              className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-cyan-500"
              required
            />
            <input
              value={resourceForm.slug}
              onChange={(event) => handleResourceChange('slug', slugify(event.target.value))}
              placeholder="resource-slug"
              className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-cyan-500"
              required
            />
            <textarea
              value={resourceForm.summary || ''}
              onChange={(event) => handleResourceChange('summary', event.target.value)}
              placeholder="Short summary"
              className="min-h-20 rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-cyan-500"
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <select
                value={resourceForm.primaryWorkspaceSlug}
                onChange={(event) => handleResourceChange('primaryWorkspaceSlug', event.target.value)}
                className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-cyan-500"
                required
              >
                <option value="">Select workspace</option>
                {workspaceOptions.map((workspace) => (
                  <option key={workspace.slug} value={workspace.slug}>{workspace.shortName || workspace.name}</option>
                ))}
              </select>
              <select
                value={resourceForm.type}
                onChange={(event) => handleResourceChange('type', event.target.value as StudyResourcePayload['type'])}
                className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-cyan-500"
              >
                {resourceTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
              </select>
              <select
                value={resourceForm.status}
                onChange={(event) => handleResourceChange('status', event.target.value as StudyResourcePayload['status'])}
                className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-cyan-500"
              >
                {resourceStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <input
                value={resourceForm.subject || ''}
                onChange={(event) => handleResourceChange('subject', event.target.value)}
                placeholder="Subject"
                className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-cyan-500"
              />
              <input
                value={resourceForm.topic || ''}
                onChange={(event) => handleResourceChange('topic', event.target.value)}
                placeholder="Topic"
                className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-cyan-500"
              />
              <input
                type="number"
                value={resourceForm.year || ''}
                onChange={(event) => handleResourceChange('year', event.target.value ? Number(event.target.value) : undefined)}
                placeholder="Year"
                className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-cyan-500"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <select
                value={resourceForm.language}
                onChange={(event) => handleResourceChange('language', event.target.value as StudyResourcePayload['language'])}
                className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-cyan-500"
              >
                {languages.map((language) => <option key={language} value={language}>{language}</option>)}
              </select>
              <select
                value={resourceForm.sourceType}
                onChange={(event) => handleResourceChange('sourceType', event.target.value)}
                className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-cyan-500"
              >
                {sourceTypes.map((sourceType) => <option key={sourceType} value={sourceType}>{sourceType}</option>)}
              </select>
              <input
                value={resourceForm.sourceName || ''}
                onChange={(event) => handleResourceChange('sourceName', event.target.value)}
                placeholder="Source name"
                className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-cyan-500"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <input
                value={resourceForm.stage || ''}
                onChange={(event) => handleResourceChange('stage', event.target.value)}
                placeholder="Stage: prelims, mains"
                className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-cyan-500"
              />
              <input
                value={resourceForm.paper || ''}
                onChange={(event) => handleResourceChange('paper', event.target.value)}
                placeholder="Paper: gs3, paper-1"
                className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-cyan-500"
              />
              <input
                value={resourceForm.updatedFor || ''}
                onChange={(event) => handleResourceChange('updatedFor', event.target.value)}
                placeholder="Updated for"
                className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-cyan-500"
              />
            </div>
            <input
              value={workspaceSlugsInput}
              onChange={(event) => setWorkspaceSlugsInput(event.target.value)}
              placeholder="Extra workspace slugs, comma-separated"
              className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-cyan-500"
            />
            <input
              value={tagsInput}
              onChange={(event) => setTagsInput(event.target.value)}
              placeholder="Tags, comma-separated"
              className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-cyan-500"
            />
            <input
              value={syllabusInput}
              onChange={(event) => setSyllabusInput(event.target.value)}
              placeholder="Syllabus nodes, comma-separated"
              className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-cyan-500"
            />
            <input
              value={resourceForm.fileUrl || ''}
              onChange={(event) => handleResourceChange('fileUrl', event.target.value)}
              placeholder="PDF/file URL"
              className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-cyan-500"
            />
            <textarea
              value={resourceForm.content || ''}
              onChange={(event) => handleResourceChange('content', event.target.value)}
              placeholder="Text content or notes body"
              className="min-h-28 rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-cyan-500"
            />
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-300">
              <input
                type="checkbox"
                checked={Boolean(resourceForm.isFeatured)}
                onChange={(event) => handleResourceChange('isFeatured', event.target.checked)}
                className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-cyan-600"
              />
              Featured on Study Hub
            </label>
          </div>

          <button className="mt-4 w-full rounded-md bg-cyan-600 px-4 py-2 font-bold text-white transition hover:bg-cyan-700">
            {editingResourceId ? 'Save Resource' : 'Create Resource'}
          </button>
        </form>
      </div>

      <div className="mt-6 rounded-lg border border-slate-700 bg-slate-900/60 p-4">
        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search resources"
            className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-cyan-500"
          />
          <select
            value={workspaceFilter}
            onChange={(event) => setWorkspaceFilter(event.target.value)}
            className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-cyan-500"
          >
            <option value="">All workspaces</option>
            {workspaceOptions.map((workspace) => (
              <option key={workspace.slug} value={workspace.slug}>{workspace.shortName || workspace.name}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-cyan-500"
          >
            <option value="all">All statuses</option>
            {resourceStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </div>

        <div className="grid gap-3">
          {isLoadingResources ? (
            <p className="text-slate-400">Loading resources...</p>
          ) : resources.length === 0 ? (
            <p className="text-slate-400">No resources found.</p>
          ) : (
            resources.map((resource) => (
              <article key={resource._id} className="rounded-lg border border-slate-700 bg-slate-800 p-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded bg-cyan-400/10 px-2 py-1 text-xs font-bold capitalize text-cyan-300">
                        {resource.type}
                      </span>
                      <span className="rounded bg-slate-700 px-2 py-1 text-xs font-bold capitalize text-slate-300">
                        {(resource as any).status || 'published'}
                      </span>
                      {resource.isFeatured && (
                        <span className="rounded bg-amber-400/10 px-2 py-1 text-xs font-bold text-amber-300">
                          Featured
                        </span>
                      )}
                    </div>
                    <h4 className="mt-2 font-bold text-white">{resource.title}</h4>
                    <p className="mt-1 text-sm text-slate-400">
                      {[resource.primaryWorkspaceId?.shortName || resource.primaryWorkspaceId?.name, resource.subject, resource.year].filter(Boolean).join(' | ') || resource.slug}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditResource(resource)}
                      className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-bold text-white transition hover:bg-blue-700"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteResource(resource._id)}
                      className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-bold text-white transition hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-slate-700 bg-slate-900/60 p-4">
        <h3 className="mb-3 text-lg font-bold text-white">Workspace index</h3>
        <div className="grid gap-2 md:grid-cols-2">
          {workspaceOptions.map((workspace) => (
            <button
              key={workspace._id}
              type="button"
              onClick={() => handleEditWorkspace(workspace)}
              className="rounded-lg border border-slate-700 bg-slate-800 p-3 text-left transition hover:border-cyan-500"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-bold text-white">{workspace.shortName || workspace.name}</span>
                <span className="rounded bg-slate-700 px-2 py-1 text-xs font-bold capitalize text-slate-300">
                  {workspace.status.replace('_', ' ')}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-400">{workspace.slug}</p>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StudyResourceManager;
