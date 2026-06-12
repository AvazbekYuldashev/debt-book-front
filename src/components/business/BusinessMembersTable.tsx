import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BusinessMemberRole, BusinessProfileDTO } from '../../types/business';
import { useI18n } from '../../i18n';
import { formatPhoneDisplay } from '../../utils/phone';

interface BusinessMembersTableProps {
  members: BusinessProfileDTO[];
  loading?: boolean;
  /** OWNER bo'lsa o'chirish/rol o'zgartirish amallari ko'rinadi. */
  canManage?: boolean;
  /** Hozir qayta ishlanayotgan a'zo profileId (loading holati). */
  busyMemberId?: string;
  onRemove?: (member: BusinessProfileDTO) => void;
  onToggleRole?: (member: BusinessProfileDTO, nextRole: BusinessMemberRole) => void;
}

const BusinessMembersTable: React.FC<BusinessMembersTableProps> = ({
  members,
  loading,
  canManage = false,
  busyMemberId,
  onRemove,
  onToggleRole,
}) => {
  const { t } = useI18n();
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (members.length === 0) {
    return <Text style={styles.empty}>{t('members.empty')}</Text>;
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tableContainer}>
      <View>
        <View style={[styles.row, styles.headerRow]}>
          <Text style={[styles.cell, styles.headerCell, styles.wide]}>{t('members.name')}</Text>
          <Text style={[styles.cell, styles.headerCell, styles.wide]}>{t('members.username')}</Text>
          <Text style={[styles.cell, styles.headerCell, styles.wide]}>{t('members.phoneCol')}</Text>
          <Text style={[styles.cell, styles.headerCell]}>{t('members.roleCol')}</Text>
          <Text style={[styles.cell, styles.headerCell, styles.wide]}>{t('members.created')}</Text>
          {canManage ? <Text style={[styles.cell, styles.headerCell, styles.actionsWide]}>{t('members.actions')}</Text> : null}
        </View>
        {members.map((member) => {
          const isOwner = member.role === 'OWNER';
          const busy = busyMemberId === member.profileId;
          const nextRole: BusinessMemberRole = member.role === 'ADMIN' ? 'MEMBER' : 'ADMIN';
          return (
            <View style={styles.row} key={member.id}>
              <Text style={[styles.cell, styles.wide]}>{member.profileName || '--'}</Text>
              <Text style={[styles.cell, styles.wide]}>{member.profileUsername || '--'}</Text>
              <Text style={[styles.cell, styles.wide]}>{formatPhoneDisplay(member.phoneNumber, '--')}</Text>
              <Text style={styles.cell}>{member.role}</Text>
              <Text style={[styles.cell, styles.wide]}>{formatDate(member.createdDate)}</Text>
              {canManage ? (
                <View style={[styles.cell, styles.actionsWide, styles.actionsCell]}>
                  {isOwner ? (
                    <Text style={styles.ownerTag}>{t('business.role.owner')}</Text>
                  ) : busy ? (
                    <ActivityIndicator size="small" />
                  ) : (
                    <>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.roleBtn]}
                        onPress={() => onToggleRole?.(member, nextRole)}
                      >
                        <Text style={styles.roleBtnText}>
                          {nextRole === 'ADMIN' ? t('members.makeAdmin') : t('members.makeUser')}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.removeBtn]}
                        onPress={() => onRemove?.(member)}
                      >
                        <Text style={styles.removeBtnText}>{t('common.delete')}</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
};

function formatDate(value?: string): string {
  if (!value) return '--';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 160,
  },
  empty: {
    textAlign: 'center',
    color: '#6B7280',
    paddingVertical: 24,
  },
  tableContainer: {
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  headerRow: {
    backgroundColor: '#F3F4F6',
  },
  cell: {
    width: 110,
    paddingVertical: 10,
    paddingHorizontal: 8,
    color: '#111827',
    fontSize: 13,
  },
  wide: {
    width: 170,
  },
  actionsWide: {
    width: 200,
  },
  actionsCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerCell: {
    fontWeight: '700',
  },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  roleBtn: {
    backgroundColor: '#EEF2FF',
  },
  roleBtnText: {
    color: '#4F46E5',
    fontSize: 12,
    fontWeight: '600',
  },
  removeBtn: {
    backgroundColor: '#FEF2F2',
  },
  removeBtnText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  ownerTag: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
});

export default BusinessMembersTable;
