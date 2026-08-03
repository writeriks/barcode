import type { ScanHistoryEntry } from '../types/history';

export type RootTabParamList = {
  Scanner: undefined;
  History: undefined;
  MyCodes: undefined;
  Settings: undefined;
};

export type HistoryStackParamList = {
  HistoryList: undefined;
  HistoryDetail: { entry: ScanHistoryEntry };
};
