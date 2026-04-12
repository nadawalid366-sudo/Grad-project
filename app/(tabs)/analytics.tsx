import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Dimensions,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width } = Dimensions.get('window');

interface StatCard {
  id: string;
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  color: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}

interface ChartData {
  label: string;
  value: number;
  percentage: number;
}

export default function Analytics() {
  const router = useRouter();
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('week');
  const [selectedTab, setSelectedTab] = useState('analytics');

  const stats: StatCard[] = [
    {
      id: '1',
      title: 'Total Patients',
      value: '48',
      change: '+12%',
      trend: 'up',
      color: '#3B82F6',
      icon: 'account-group',
    },
    {
      id: '2',
      title: 'Active Cases',
      value: '32',
      change: '+8%',
      trend: 'up',
      color: '#10B981',
      icon: 'medical-bag',
    },
    {
      id: '3',
      title: 'Alerts Resolved',
      value: '156',
      change: '+24%',
      trend: 'up',
      color: '#F59E0B',
      icon: 'alert-circle-check',
    },
    {
      id: '4',
      title: 'Avg Response Time',
      value: '12m',
      change: '-18%',
      trend: 'down',
      color: '#8B5CF6',
      icon: 'clock-fast',
    },
  ];

  const patientsByCondition: ChartData[] = [
    { label: 'Diabetes', value: 18, percentage: 37.5 },
    { label: 'Hypertension', value: 15, percentage: 31.25 },
    { label: 'Asthma', value: 8, percentage: 16.67 },
    { label: 'Other', value: 7, percentage: 14.58 },
  ];

  const weeklyActivity: ChartData[] = [
    { label: 'Mon', value: 12, percentage: 60 },
    { label: 'Tue', value: 18, percentage: 90 },
    { label: 'Wed', value: 15, percentage: 75 },
    { label: 'Thu', value: 20, percentage: 100 },
    { label: 'Fri', value: 16, percentage: 80 },
    { label: 'Sat', value: 8, percentage: 40 },
    { label: 'Sun', value: 5, percentage: 25 },
  ];

  const alertTrends = [
    { severity: 'Critical', count: 8, color: '#EF4444', percentage: 16 },
    { severity: 'High', count: 15, color: '#F59E0B', percentage: 30 },
    { severity: 'Medium', count: 18, color: '#3B82F6', percentage: 36 },
    { severity: 'Low', count: 9, color: '#10B981', percentage: 18 },
  ];

  const renderStatCard = (stat: StatCard) => (
    <View key={stat.id} style={[styles.statCard, { borderLeftColor: stat.color }]}>
      <View style={styles.statHeader}>
        <MaterialCommunityIcons name={stat.icon} size={24} color={stat.color} />
        <View style={[styles.trendBadge, { backgroundColor: stat.trend === 'up' ? '#D1FAE5' : '#FEE2E2' }]}>
          <Ionicons
            name={stat.trend === 'up' ? 'trending-up' : 'trending-down'}
            size={12}
            color={stat.trend === 'up' ? '#10B981' : '#EF4444'}
          />
          <Text style={[styles.changeText, { color: stat.trend === 'up' ? '#10B981' : '#EF4444' }]}>
            {stat.change}
          </Text>
        </View>
      </View>
      <Text style={styles.statValue}>{stat.value}</Text>
      <Text style={styles.statTitle}>{stat.title}</Text>
    </View>
  );

  const renderBarChart = () => (
    <View style={styles.chartContainer}>
      <View style={styles.chartHeader}>
        <Text style={styles.chartTitle}>Weekly Activity</Text>
        <View style={styles.periodSelector}>
          {(['week', 'month', 'year'] as const).map((period) => (
            <TouchableOpacity
              key={period}
              style={[styles.periodButton, selectedPeriod === period && styles.periodButtonActive]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text style={[styles.periodText, selectedPeriod === period && styles.periodTextActive]}>
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View style={styles.barChartContainer}>
        {weeklyActivity.map((item, index) => (
          <View key={index} style={styles.barWrapper}>
            <View style={styles.barColumn}>
              <View style={[styles.bar, { height: `${item.percentage}%` }]}>
                <Text style={styles.barValue}>{item.value}</Text>
              </View>
            </View>
            <Text style={styles.barLabel}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderPieChart = () => (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Patients by Condition</Text>
      <View style={styles.pieChartContainer}>
        <View style={styles.pieChartCircle}>
          <Text style={styles.pieChartTotal}>48</Text>
          <Text style={styles.pieChartLabel}>Total</Text>
        </View>
        <View style={styles.pieLegend}>
          {patientsByCondition.map((item, index) => (
            <View key={index} style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: getColorForIndex(index) }]} />
              <View style={styles.legendText}>
                <Text style={styles.legendLabel}>{item.label}</Text>
                <Text style={styles.legendValue}>{item.value} ({item.percentage.toFixed(1)}%)</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  const renderAlertTrends = () => (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Alert Distribution</Text>
      <View style={styles.alertTrendsContainer}>
        {alertTrends.map((alert, index) => (
          <View key={index} style={styles.alertTrendItem}>
            <View style={styles.alertTrendHeader}>
              <View style={styles.alertTrendInfo}>
                <View style={[styles.alertDot, { backgroundColor: alert.color }]} />
                <Text style={styles.alertSeverity}>{alert.severity}</Text>
              </View>
              <Text style={styles.alertCount}>{alert.count}</Text>
            </View>
            <View style={styles.alertProgressBar}>
              <View
                style={[
                  styles.alertProgressFill,
                  { width: `${alert.percentage}%`, backgroundColor: alert.color },
                ]}
              />
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  const getColorForIndex = (index: number): string => {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];
    return colors[index % colors.length];
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Analytics</Text>
          <Text style={styles.headerSubtitle}>Performance Overview</Text>
        </View>
        <TouchableOpacity style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {stats.map((stat) => renderStatCard(stat))}
        </View>

        {/* Bar Chart */}
        {renderBarChart()}

        {/* Patients by Condition */}
        {renderPieChart()}

        {/* Alert Trends */}
        {renderAlertTrends()}

        {/* Performance Metrics */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Performance Metrics</Text>
          <View style={styles.metricsContainer}>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Patient Satisfaction</Text>
              <View style={styles.metricBar}>
                <View style={[styles.metricFill, { width: '92%', backgroundColor: '#10B981' }]} />
                <Text style={styles.metricValue}>92%</Text>
              </View>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Treatment Success Rate</Text>
              <View style={styles.metricBar}>
                <View style={[styles.metricFill, { width: '88%', backgroundColor: '#3B82F6' }]} />
                <Text style={styles.metricValue}>88%</Text>
              </View>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Follow-up Compliance</Text>
              <View style={styles.metricBar}>
                <View style={[styles.metricFill, { width: '76%', backgroundColor: '#F59E0B' }]} />
                <Text style={styles.metricValue}>76%</Text>
              </View>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Alert Response Rate</Text>
              <View style={styles.metricBar}>
                <View style={[styles.metricFill, { width: '95%', backgroundColor: '#8B5CF6' }]} />
                <Text style={styles.metricValue}>95%</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Recent Insights */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Key Insights</Text>
          <View style={styles.insightsContainer}>
            <View style={styles.insightItem}>
              <Ionicons name="trending-up" size={20} color="#10B981" />
              <Text style={styles.insightText}>
                Patient engagement increased by 24% this month
              </Text>
            </View>
            <View style={styles.insightItem}>
              <Ionicons name="time-outline" size={20} color="#3B82F6" />
              <Text style={styles.insightText}>
                Average response time improved by 18%
              </Text>
            </View>
            <View style={styles.insightItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.insightText}>
                156 alerts successfully resolved this week
              </Text>
            </View>
            <View style={styles.insightItem}>
              <Ionicons name="people" size={20} color="#F59E0B" />
              <Text style={styles.insightText}>
                12 new patients added this month
              </Text>
            </View>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNavigation}>
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.push('/(tabs)/dochome')}
        >
          <Ionicons 
            name="grid" 
            size={24} 
            color={selectedTab === 'dashboard' ? '#3B82F6' : '#9CA3AF'} 
          />
          <Text style={[
            styles.navLabel, 
            selectedTab === 'dashboard' && { color: '#3B82F6' }
          ]}>Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.push('/(tabs)/patients')}
        >
          <Ionicons 
            name="people" 
            size={24} 
            color={selectedTab === 'patients' ? '#3B82F6' : '#9CA3AF'} 
          />
          <Text style={[
            styles.navLabel,
            selectedTab === 'patients' && { color: '#3B82F6' }
          ]}>My Patients</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.push('/(tabs)/alerts')}
        >
          <Ionicons 
            name="alert-circle" 
            size={24} 
            color={selectedTab === 'alerts' ? '#3B82F6' : '#9CA3AF'} 
          />
          <Text style={[
            styles.navLabel,
            selectedTab === 'alerts' && { color: '#3B82F6' }
          ]}>Alerts</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.push('/(tabs)/docplans')}
        >
          <Ionicons 
            name="clipboard" 
            size={24} 
            color={selectedTab === 'plans' ? '#3B82F6' : '#9CA3AF'} 
          />
          <Text style={[
            styles.navLabel,
            selectedTab === 'plans' && { color: '#3B82F6' }
          ]}>Plans</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => setSelectedTab('analytics')}
        >
          <Ionicons 
            name="bar-chart" 
            size={24} 
            color={selectedTab === 'analytics' ? '#3B82F6' : '#9CA3AF'} 
          />
          <Text style={[
            styles.navLabel,
            selectedTab === 'analytics' && { color: '#3B82F6' }
          ]}>Analytics</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 12,
  },
  statCard: {
    width: (width - 48) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  changeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  chartContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 2,
  },
  periodButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  periodButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  periodText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  periodTextActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  barChartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 200,
    paddingTop: 20,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
  },
  barColumn: {
    flex: 1,
    width: '70%',
    justifyContent: 'flex-end',
  },
  bar: {
    backgroundColor: '#3B82F6',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    minHeight: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  barValue: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  barLabel: {
    marginTop: 8,
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  pieChartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pieChartCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#EFF6FF',
    borderWidth: 12,
    borderColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pieChartTotal: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
  },
  pieChartLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  pieLegend: {
    flex: 1,
    marginLeft: 20,
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 3,
    marginRight: 10,
  },
  legendText: {
    flex: 1,
  },
  legendLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  legendValue: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  alertTrendsContainer: {
    gap: 16,
  },
  alertTrendItem: {
    gap: 8,
  },
  alertTrendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertTrendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  alertSeverity: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  alertCount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  alertProgressBar: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  alertProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  metricsContainer: {
    gap: 20,
  },
  metricRow: {
    gap: 8,
  },
  metricLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  metricBar: {
    height: 32,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
  },
  metricFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    borderRadius: 8,
  },
  metricValue: {
    position: 'absolute',
    right: 12,
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  insightsContainer: {
    gap: 16,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  bottomNavigation: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingBottom: 8,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  navLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
    fontWeight: '500',
  },
});
