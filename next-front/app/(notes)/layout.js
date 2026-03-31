'use client'

import { createContext, useState, useEffect, useCallback, useRef , useLayoutEffect} from 'react';
import { useRouter } from 'next/navigation';
import 'bootstrap/dist/css/bootstrap.min.css'
import './globals.css'
import BootstrapClient from '../components/BootstrapClient'
import TopNavbar from '../components/TopNavbar'
import BackToTop from '../components/BackToTop'
import { fetchWithAuth } from '../lib/api';
import { logout } from '../lib/auth';
import { Toast, ToastContainer } from 'react-bootstrap';
import { handleApiError } from '../utils/errorHandler';
import { Modal, Spinner } from 'react-bootstrap';
import styles from './layout.module.css';
import { ExternalLinkProvider } from '../components/notecard/ExternalLinkModal';


export const NoteListContext = createContext([]);
export const WorkspaceContext = createContext({ selectedWorkspaceSlug: null, selectWorkspaceSlug: () => {}, workspaces: [], setWorkspaces: () => {} });
export const ModalContext = createContext({});
export const ToastContext = createContext({});
export const AuthContext = createContext();


  export const NOTE_LISTS_CACHE_KEY = 'cachedNoteLists';
  export const WORKSPACES_CACHE_KEY = 'cachedWorkspaces';
  export const SELECTED_WORKSPACE_CACHE_KEY = 'selectedWorkspaceSlug';

export default function RootLayout({ children }) {

  const [noteLists, setNoteLists] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspaceSlug, setSelectedWorkspaceSlug] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(SELECTED_WORKSPACE_CACHE_KEY) || null;
    }
    return null;
  });

  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [toast, setToast] = useState({ show: false, title: '', body: '', delay: 3000, variant: 'primary' });
  const initialDataRequestedRef = useRef(false);
  const router = useRouter();

  const handleLogout = useCallback(async () => {
    await logout();
    router.push('/login');
  }, [router]);

const applyWorkspaceSelection = useCallback((workspaceData) => {
  const savedSlug = localStorage.getItem(SELECTED_WORKSPACE_CACHE_KEY);
  const resolved =
    workspaceData.find((ws) => ws.slug === savedSlug) ||
    workspaceData.find((ws) => ws.is_default) ||
    workspaceData[0] ||
    null;

  if (resolved && resolved.slug !== savedSlug) {
    localStorage.setItem(SELECTED_WORKSPACE_CACHE_KEY, resolved.slug);
    setSelectedWorkspaceSlug(resolved.slug);
  } else if (!resolved) {
    localStorage.removeItem(SELECTED_WORKSPACE_CACHE_KEY);
    setSelectedWorkspaceSlug(null);
  }
}, []); 

  const getLists = useCallback(async () => {
    try {
      const response = await fetchWithAuth('/api/note/list/');
      if (!response.ok) {
        throw new Error('Failed to fetch note lists');
      }
      const data = await response.json();
      const sortedData = data.sort((a, b) => a.archived - b.archived);
      setNoteLists(sortedData);
      localStorage.setItem(NOTE_LISTS_CACHE_KEY, JSON.stringify(sortedData));
    } catch (err) {
      console.error(`Error: ${err}`);
      handleApiError(err);
    }
  }, [NOTE_LISTS_CACHE_KEY]);

  const updateWorkspaces = useCallback(async () => {
    try {
      const response = await fetchWithAuth('/api/note/workspaces/');
      if (!response.ok) {
        throw new Error('Failed to fetch workspaces');
      }
      const data = await response.json();
      setWorkspaces(data);
      console.log("Fetched workspaces:", data);
      localStorage.setItem(WORKSPACES_CACHE_KEY, JSON.stringify(data));
      applyWorkspaceSelection(data);
    } catch (err) {
      console.error(`Error: ${err}`);
      handleApiError(err);
    } finally {
    }
  }, [WORKSPACES_CACHE_KEY, applyWorkspaceSelection]);

  const selectWorkspaceSlug = useCallback((workspaceSlug) => {
    setSelectedWorkspaceSlug(workspaceSlug);
    if (workspaceSlug) {
      localStorage.setItem(SELECTED_WORKSPACE_CACHE_KEY, workspaceSlug);
    } else {
      localStorage.removeItem(SELECTED_WORKSPACE_CACHE_KEY);
    }
  }, []);

  const showToast = useCallback((title, body, delay = 3000, variant = 'primary') => {
    setToast({ show: true, title, body, delay, variant });
  }, []);

  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    setIsAuthenticated(!!accessToken);

    if (accessToken && !initialDataRequestedRef.current) {
      initialDataRequestedRef.current = true;

      const cachedListsRaw = localStorage.getItem(NOTE_LISTS_CACHE_KEY);
      if (cachedListsRaw) {
          const cachedLists = JSON.parse(cachedListsRaw);
            setNoteLists(cachedLists);
      } else {
        getLists();
      }

      const cachedWorkspacesRaw = localStorage.getItem(WORKSPACES_CACHE_KEY);
      if (cachedWorkspacesRaw) {
        const cachedWorkspaces = JSON.parse(cachedWorkspacesRaw);
        setWorkspaces(cachedWorkspaces);
        applyWorkspaceSelection(cachedWorkspaces);
        updateWorkspaces(); // background refresh
      } else {
        updateWorkspaces(); // ✅ fetch on first load / cache miss
}
    }

    const showWaitingModal = (e) => {
      const title = typeof e.detail === 'string' ? e.detail : e.detail?.title;
      setShowModal(true);
      setModalTitle(title || 'Please wait');
    };

    const hideWaitingModal = () => {
      setShowModal(false);
    };

    const handleShowToast = (event) => {
      const { title, body, delay, variant } = event.detail;
      showToast(title, body, delay, variant);
    };

    window.addEventListener('showWaitingModal', showWaitingModal);
    window.addEventListener('hideWaitingModal', hideWaitingModal);
    window.addEventListener('updateNoteLists', getLists);
    window.addEventListener('updateWorkspaces', updateWorkspaces);
    window.addEventListener('showToast', handleShowToast);

    return () => {
      window.removeEventListener('showWaitingModal', showWaitingModal);
      window.removeEventListener('hideWaitingModal', hideWaitingModal);
      window.removeEventListener('updateNoteLists', getLists);
      window.removeEventListener('updateWorkspaces', updateWorkspaces);
      window.removeEventListener('showToast', handleShowToast);
    };
  }, [getLists, updateWorkspaces, showToast, NOTE_LISTS_CACHE_KEY, WORKSPACES_CACHE_KEY, applyWorkspaceSelection]);

  return (
    <html lang="en" data-bs-theme="light">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Notes</title>
      </head>
      <body>
        <AuthContext.Provider value={{ isAuthenticated, setIsAuthenticated }}>
          <NoteListContext.Provider value={noteLists}>
                <WorkspaceContext.Provider value={{ 
                  selectedWorkspaceSlug, 
                  selectWorkspaceSlug, 
                  workspaces, 
                  setWorkspaces 
                }}>
                  <ModalContext.Provider value={{ showModal, setShowModal, modalTitle, setModalTitle }}>
                    <ToastContext.Provider value={showToast}>
                      <ExternalLinkProvider>
                        <TopNavbar isLoggedIn={isAuthenticated} onLogout={handleLogout} />
                        <div className="h-100" style={{ minHeight: '100vh' }}>
                          {children}
                          <BootstrapClient />
                        </div>
                        <BackToTop />
                      </ExternalLinkProvider>
                      <ToastContainer position="top-end" className="p-3 position-fixed">
                        <Toast
                          onClose={() => setToast(prev => ({ ...prev, show: false }))}
                          show={toast.show}
                          delay={toast.delay}
                          autohide
                          bg={toast.variant}
                        >
                          <Toast.Header>
                            <strong className="me-auto">{toast.title}</strong>
                          </Toast.Header>
                          <Toast.Body>{toast.body}</Toast.Body>
                        </Toast>
                      </ToastContainer>
                    </ToastContext.Provider>
                    <Modal
                      show={showModal}
                      centered
                      backdrop="static"
                      keyboard={false}
                      className={styles.modalFade}
                    >
                      <Modal.Header>
                        <Modal.Title>{modalTitle}</Modal.Title>
                      </Modal.Header>
                      <Modal.Body className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
                        <Spinner animation="border" role="status" style={{ width: '8rem', height: '8rem' }}>
                          <span className="sr-only">Loading...</span>
                        </Spinner>
                      </Modal.Body>
                    </Modal>
                  </ModalContext.Provider>
                </WorkspaceContext.Provider>
          </NoteListContext.Provider>
        </AuthContext.Provider>
      </body>
    </html>
  );
}