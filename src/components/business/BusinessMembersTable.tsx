import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BusinessProfileDTO } from '../../types/business';

interface BusinessMembersTableProps {
  members: BusinessProfileDTO[];
  loading?: boolean;
}

const BusinessMembersTable: React.FC<BusinessMembersTableProps> = ({ members, loading }) => {
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (members.length === 0) {
    return <Text style={styles.empty}>Members topilmadi</Text>;
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tableContainer}>
      <View>
        <View style={[styles.row, styles.headerRow]}>
          <Text style={[styles.cell, styles.headerCell, styles.wide]}>Name</Text>
          <Text style={[styles.cell, styles.headerCell, styles.wide]}>Username</Text>
          <Text style={[styles.cell, styles.headerCell]}>Role</Text>
          <Text style={[styles.cell, styles.headerCell, styles.wide]}>Created</Text>
        </View>
        {members.map((member) => (
          <View style={styles.row} key={member.id}>
            <Text style={[styles.cell, styles.wide]}>{member.profileName || '--'}</Text>
            <Text style={[styles.cell, styles.wide]}>{member.profileUsername || '--'}</Text>
            <Text style={styles.cell}>{member.role}</Text>
            <Text style={[styles.cell, styles.wide]}>{formatDate(member.createdDate)}</Text>
          </View>
        ))}
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
  headerCell: {
    fontWeight: '700',
  },
});

export default BusinessMembersTable;
