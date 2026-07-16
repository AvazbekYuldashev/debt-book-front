import React from 'react';
import LegalDocumentView from '../../components/legal/LegalDocumentView';
import type { ProfileScreenProps } from '../../navigation/types';
import { ROUTES } from '../../navigation/routes';

type Props = ProfileScreenProps<typeof ROUTES.TERMS>;

const TermsScreen: React.FC<Props> = ({ navigation }) => (
  <LegalDocumentView docKey="terms" onBack={navigation.goBack} />
);

export default TermsScreen;
