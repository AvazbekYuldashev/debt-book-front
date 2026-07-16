import React from 'react';
import LegalDocumentView from '../../components/legal/LegalDocumentView';
import type { ProfileScreenProps } from '../../navigation/types';
import { ROUTES } from '../../navigation/routes';

type Props = ProfileScreenProps<typeof ROUTES.OFFER>;

const OfferScreen: React.FC<Props> = ({ navigation }) => (
  <LegalDocumentView docKey="offer" onBack={navigation.goBack} />
);

export default OfferScreen;
