import CarpaDetailPageScreen from '@/features/carpa/screens/CarpaDetailPage';
import { uiFlags } from '@/lib/featureFlags';

export default function CarpaDetailPage() {
  if (!uiFlags.carpa) {
    return <CarpaDetailPageScreen />;
  }

  return (
    <div className="rebrand-carpa">
      <CarpaDetailPageScreen />
    </div>
  );
}
