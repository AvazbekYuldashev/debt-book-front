import React from 'react';
import LegalDocumentView from '../components/LegalDocumentView';
import type { ProfileScreenProps } from '../../../app/navigation/types';
import { ROUTES } from '../../../app/navigation/routes';

type Props = ProfileScreenProps<typeof ROUTES.PRIVACY_POLICY>;

const PrivacyPolicyScreen: React.FC<Props> = ({ navigation }) => (
  <LegalDocumentView docKey="privacy" onBack={navigation.goBack} />
);

export default PrivacyPolicyScreen;
