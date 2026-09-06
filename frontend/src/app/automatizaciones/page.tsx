import AutomatizacionesPageScreen from '@/features/automatizaciones/screens/AutomatizacionesPage';
import { uiFlags } from '@/lib/featureFlags';

export default function AutomatizacionesPage() {
  if (!uiFlags.automations) {
    return <AutomatizacionesPageScreen />;
  }

  return (
    <div className="rebrand-automations">
      <AutomatizacionesPageScreen />
    </div>
  );
}
