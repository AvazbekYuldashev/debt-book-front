import React from 'react';
import LegalDocumentView from '../../components/legal/LegalDocumentView';
import type { ProfileScreenProps } from '../../navigation/types';
import { ROUTES } from '../../navigation/routes';

type Props = ProfileScreenProps<typeof ROUTES.PRIVACY_POLICY>;

const PrivacyPolicyScreen: React.FC<Props> = ({ navigation }) => (
  <LegalDocumentView docKey="privacy" onBack={navigation.goBack} />
);

export default PrivacyPolicyScreen;
