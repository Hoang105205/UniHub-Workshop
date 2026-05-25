import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  deleteAllPendingCheckins,
  deletePendingCheckin,
  fetchPendingList,
  initDb,
  PendingCheckinRecord,
} from '../services/sqlite';
import { syncSingleCheckin } from '../services/sync';

export interface PendingListScreenProps {
  onBack: () => void;
}

export default function PendingListScreen({ onBack }: PendingListScreenProps) {
  const [items, setItems] = useState<PendingCheckinRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      await initDb();
      const data = await fetchPendingList();
      setItems(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const handleRetry = useCallback(
    async (record: PendingCheckinRecord) => {
      setLoading(true);
      try {
        await syncSingleCheckin(record);
      } finally {
        await loadItems();
      }
    },
    [loadItems]
  );

  const handleDelete = useCallback(
    async (record: PendingCheckinRecord) => {
      setLoading(true);
      try {
        await deletePendingCheckin(record.id);
      } finally {
        await loadItems();
      }
    },
    [loadItems]
  );

  const handleDeleteAll = useCallback(async () => {
    setLoading(true);
    try {
      await deleteAllPendingCheckins();
    } finally {
      await loadItems();
    }
  }, [loadItems]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Pending Check-ins</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={loadItems}>
            <Text style={styles.backText}>Refresh</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDeleteAll}>
            <Text style={styles.deleteAllText}>Delete All</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#f4b400" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={items.length === 0 ? styles.emptyContainer : undefined}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No pending check-ins.</Text>
          }
          renderItem={({ item }) => {
            const hasError = Boolean(item.sync_error) || item.synced === -1;
            return (
              <View style={[styles.card, hasError && styles.cardError]}>
                <View style={styles.cardRow}>
                  <Text style={styles.cardTitle}>{item.qr_code}</Text>
                  <Text style={styles.cardSubtitle}>
                    {new Date(item.scanned_at * 1000).toLocaleString()}
                  </Text>
                </View>
                {hasError && (
                  <Text style={styles.errorText}>{item.sync_error ?? 'Sync failed'}</Text>
                )}
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.retryButton]}
                    onPress={() => handleRetry(item)}
                  >
                    <Text style={styles.actionText}>Retry</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDelete(item)}
                  >
                    <Text style={styles.actionText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: 50,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backText: {
    color: '#211922',
    fontWeight: '600',
    fontSize: 12,
    fontFamily: 'Pin Sans',
  },
  deleteAllText: {
    color: '#9e0a0a',
    fontWeight: '600',
    fontSize: 12,
    fontFamily: 'Pin Sans',
  },
  title: {
    color: '#211922',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.4,
    fontFamily: 'Pin Sans',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyText: {
    color: '#62625b',
    fontFamily: 'Pin Sans',
  },
  card: {
    backgroundColor: '#f6f6f3',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 20,
  },
  cardError: {
    borderWidth: 1,
    borderColor: '#9e0a0a',
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardTitle: {
    color: '#211922',
    fontWeight: '600',
    flex: 1,
    paddingRight: 12,
    fontFamily: 'Pin Sans',
  },
  cardSubtitle: {
    color: '#62625b',
    fontSize: 12,
    fontFamily: 'Pin Sans',
  },
  errorText: {
    color: '#9e0a0a',
    marginTop: 8,
    fontFamily: 'Pin Sans',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
  },
  actionButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  retryButton: {
    backgroundColor: '#e60023',
  },
  deleteButton: {
    backgroundColor: '#e5e5e0',
  },
  actionText: {
    color: '#000000',
    fontWeight: '600',
    fontSize: 12,
    fontFamily: 'Pin Sans',
  },
});
