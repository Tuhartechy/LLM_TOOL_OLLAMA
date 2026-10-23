export const getApiBaseUrl = () => {
  const customUrl = localStorage.getItem('backend_url');
  if (customUrl && customUrl.trim()) {
    return customUrl.trim().replace(/\/$/, '');
  }
  return import.meta.env.VITE_API_BASE_URL || '';
};

const getHeaders = () => {
  const code = localStorage.getItem('access_code') || '';
  return {
    'Content-Type': 'application/json',
    'X-Access-Code': code
  };
};

export const fetchHealth = async () => {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/health`);
  return res.json();
};

export const fetchModels = async () => {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/models`, { headers: getHeaders() });
  return res.json();
};

export const fetchConversations = async () => {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/conversations`, { headers: getHeaders() });
  return res.json();
};

export const createConversation = async (title = 'New Conversation') => {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/conversations`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ title })
  });
  return res.json();
};

export const fetchConversation = async (id) => {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/conversations/${id}`, { headers: getHeaders() });
  return res.json();
};

export const updateConversation = async (id, title) => {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/conversations/${id}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ title })
  });
  return res.json();
};

export const deleteConversation = async (id) => {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/conversations/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  return res.json();
};

export const uploadRAGDocument = async (file) => {
  const base = getApiBaseUrl();
  const code = localStorage.getItem('access_code') || '';
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${base}/api/upload`, {
    method: 'POST',
    headers: { 'X-Access-Code': code },
    body: formData
  });
  return res.json();
};
