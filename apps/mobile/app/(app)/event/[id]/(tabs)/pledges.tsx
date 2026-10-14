import { Banner, Screen, Txt } from '../../../../../src/ui/kit';
import { useT } from '../../../../../src/lib/i18n';

/** Phase 6 adds pledges and payments; the API does not have them yet. */
export default function Pledges() {
  const t = useT();
  return (
    <Screen>
      <Txt size={20} bold>
        {t('nav.pledges')}
      </Txt>
      <Banner text={t('mobile.pledgesSoon')} />
    </Screen>
  );
}
