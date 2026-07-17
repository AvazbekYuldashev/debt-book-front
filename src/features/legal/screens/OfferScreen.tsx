import React from 'react';
import LegalDocumentView from '../components/LegalDocumentView';
import type { ProfileScreenProps } from '../../../app/navigation/types';
import { ROUTES } from '../../../app/navigation/routes';

type Props = ProfileScreenProps<typeof ROUTES.OFFER>;

const OfferScreen: React.FC<Props> = ({ navigation }) => (
  <LegalDocumentView docKey="offer" onBack={navigation.goBack} />
);

export default OfferScreen;
