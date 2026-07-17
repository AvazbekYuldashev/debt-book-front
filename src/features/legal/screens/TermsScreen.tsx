import React from 'react';
import LegalDocumentView from '../components/LegalDocumentView';
import type { ProfileScreenProps } from '../../../app/navigation/types';
import { ROUTES } from '../../../app/navigation/routes';

type Props = ProfileScreenProps<typeof ROUTES.TERMS>;

const TermsScreen: React.FC<Props> = ({ navigation }) => (
  <LegalDocumentView docKey="terms" onBack={navigation.goBack} />
);

export default TermsScreen;
