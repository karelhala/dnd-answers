import { createContext, useContext, useEffect, useReducer, useState } from 'react';
import type { Dispatch, ReactNode } from 'react';
import { createWorkshop } from './createWorkshop';
import { saveWorkshop } from './persistence';
import type { StorageStatus, WorkshopBootstrap } from './persistence';
import { workshopReducer } from './reducer';
import type { WorkshopAction, WorkshopState } from './types';

interface WorkshopContextValue {
  state: WorkshopState;
  dispatch: Dispatch<WorkshopAction>;
  storageStatus: StorageStatus;
  resetSavedProgress: () => void;
}

const WorkshopContext = createContext<WorkshopContextValue | null>(null);

export function WorkshopProvider({ initial, children }: { initial: WorkshopBootstrap; children: ReactNode }) {
  const [state, dispatch] = useReducer(workshopReducer, initial.state);
  const [storageStatus, setStorageStatus] = useState(initial.status);

  useEffect(() => {
    if (storageStatus === 'ready' && !saveWorkshop(initial.storage, state)) {
      setStorageStatus('unavailable');
    }
  }, [state, storageStatus, initial.storage]);

  function resetSavedProgress() {
    dispatch({ type: 'RESET_WORKSHOP', replacement: createWorkshop(), confirmed: true });
    setStorageStatus('ready');
  }

  return (
    <WorkshopContext.Provider value={{ state, dispatch, storageStatus, resetSavedProgress }}>
      {children}
    </WorkshopContext.Provider>
  );
}

export function useWorkshop(): WorkshopContextValue {
  const context = useContext(WorkshopContext);
  if (!context) throw new Error('Workshop controls require WorkshopProvider.');
  return context;
}
