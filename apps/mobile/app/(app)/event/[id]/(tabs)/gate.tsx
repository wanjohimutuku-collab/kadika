import { Banner, Screen, Txt } from '../../../../../src/ui/kit';
import { useT } from '../../../../../src/lib/i18n';

/** Phase 5 builds the offline scanner here; until then this tab says so plainly. */
export default function Gate() {
  const t = useT();
  return (
    <Screen>
      <Txt size={20} bold>
        {t('nav.gate')}
      </Txt>
      <Banner text={t('mobile.gateSoon')} />
    </Screen>
  );
}
