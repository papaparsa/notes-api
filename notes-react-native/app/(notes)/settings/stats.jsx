import ScrollPage from '../../../components/ScrollPage';
import StatsDisplay from '../../../components/StatsDisplay';
import FileAccessStats from '../../../components/FileAccessStats';
import { H } from '../../../components/ui';

export default function StatsPage() {
  return (
    <ScrollPage contentContainerStyle={{ padding: 12, paddingTop: 24, maxWidth: 1320, alignSelf: 'center', width: '100%' }}>
      <H level={2} style={{ marginBottom: 24 }}>Statistics</H>
      <StatsDisplay title="Revisions" endpoint="/api/note/stats/revisions/" />
      <StatsDisplay title="Notes" endpoint="/api/note/stats/notes/" />
      <FileAccessStats />
    </ScrollPage>
  );
}
