"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { checkAdminAuth, User as AdminUser } from "../../lib/adminAuth";
import { apiFetch } from "../../lib/api";


interface DashboardStats {
  totalUsers: number;
  totalPosts: number;
  totalMessages: number;
  activeUsers: number;
  newUsersToday: number;
  postsToday: number;
  messagesToday: number;
  onlineUsers: number;
}


export default function DashboardPage() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'analytics'>('overview');
  const router = useRouter();

  useEffect(() => {
    fetchUser();
    fetchStats();
    fetchUsers();
  }, []);

  const fetchUser = async () => {
    try {
      const { user, isAdmin } = await checkAdminAuth();
      
      if (!user || !isAdmin) {
        router.push("/");
        return;
      }

      setUser(user);
    } catch (error) {
      console.error("Failed to fetch user:", error);
      router.push("/");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Mock stats for now - you can implement real API endpoints later
      setStats({
        totalUsers: 1250,
        totalPosts: 3420,
        totalMessages: 15680,
        activeUsers: 89,
        newUsersToday: 23,
        postsToday: 156,
        messagesToday: 892,
        onlineUsers: 45
      });
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      // Mock users data for now
      setUsers([
        {
          id: "1",
          walletAddress: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
          username: "admin_user",
          displayName: "Admin User",
          bio: "Platform Administrator",
          avatarUrl: null,
          avatarBlob: null,
          email: "admin@layer4.com",
          role: 0,
          isAdmin: true,
          emailVerified: true
        },
        {
          id: "2",
          walletAddress: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
          username: "john_doe",
          displayName: "John Doe",
          bio: "Crypto enthusiast",
          avatarUrl: null,
          avatarBlob: null,
          email: "john@example.com",
          role: 1,
          isAdmin: false,
          emailVerified: true
        },
        {
          id: "3",
          walletAddress: "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1",
          username: "jane_smith",
          displayName: "Jane Smith",
          bio: "DeFi trader",
          avatarUrl: null,
          avatarBlob: null,
          email: "jane@example.com",
          role: 1,
          isAdmin: false,
          emailVerified: false
        },
        {
          id: "4",
          walletAddress: "3QJmV3qfvL9SuC34wDhyXkZ2WSnKrgD7dxT2MpUVix1y",
          username: "crypto_trader",
          displayName: "Crypto Trader",
          bio: "Professional trader",
          avatarUrl: null,
          avatarBlob: null,
          email: null,
          role: 1,
          isAdmin: false,
          emailVerified: false
        }
      ]);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  };

  const promoteToAdmin = async (walletAddress: string) => {
    try {
      const res = await apiFetch("/auth/promote-admin", {
        method: "POST",
        body: JSON.stringify({ walletAddress })
      });
      
      if (res.ok) {
        // Refresh users list
        await fetchUsers();
        alert("User promoted to admin successfully!");
      } else {
        const error = await res.json();
        alert(error.error || "Failed to promote user");
      }
    } catch (error) {
      console.error("Failed to promote user:", error);
      alert("Failed to promote user");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!user || !user.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Access Denied</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "'LisaStyle', monospace" }}>
            📊 Admin Dashboard
          </h1>
          <p className="text-gray-600">Welcome back, {user.displayName || user.username || "Admin"}!</p>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📈 Overview
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'users'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                👥 Users
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'analytics'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📊 Analytics
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white border-2 border-[#808080] rounded-lg p-6 shadow-lg">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Users</p>
                    <p className="text-2xl font-bold text-gray-900">{stats?.totalUsers || 0}</p>
                    <p className="text-xs text-green-600">+{stats?.newUsersToday || 0} today</p>
                  </div>
                </div>
              </div>

              <div className="bg-white border-2 border-[#808080] rounded-lg p-6 shadow-lg">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Posts</p>
                    <p className="text-2xl font-bold text-gray-900">{stats?.totalPosts || 0}</p>
                    <p className="text-xs text-green-600">+{stats?.postsToday || 0} today</p>
                  </div>
                </div>
              </div>

              <div className="bg-white border-2 border-[#808080] rounded-lg p-6 shadow-lg">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Messages</p>
                    <p className="text-2xl font-bold text-gray-900">{stats?.totalMessages || 0}</p>
                    <p className="text-xs text-green-600">+{stats?.messagesToday || 0} today</p>
                  </div>
                </div>
              </div>

              <div className="bg-white border-2 border-[#808080] rounded-lg p-6 shadow-lg">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Online Users</p>
                    <p className="text-2xl font-bold text-gray-900">{stats?.onlineUsers || 0}</p>
                    <p className="text-xs text-blue-600">Active now</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white border-2 border-[#808080] rounded-lg p-6 shadow-lg">
              <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-gray-200">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    <span className="text-sm">New user registered</span>
                  </div>
                  <span className="text-xs text-gray-500">2 minutes ago</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-200">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    <span className="text-sm">New post created</span>
                  </div>
                  <span className="text-xs text-gray-500">5 minutes ago</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-200">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                    <span className="text-sm">New message sent</span>
                  </div>
                  <span className="text-xs text-gray-500">8 minutes ago</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
                    <span className="text-sm">User logged in</span>
                  </div>
                  <span className="text-xs text-gray-500">12 minutes ago</span>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'users' && (
          <div className="bg-white border-2 border-[#808080] rounded-lg shadow-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">User Management</h3>
              <p className="text-sm text-gray-600">Manage users, roles, and permissions</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                            {user.username ? user.username.charAt(0).toUpperCase() : user.walletAddress.charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {user.displayName || user.username || "Unknown"}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.walletAddress.slice(0, 8)}...{user.walletAddress.slice(-8)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.role === 0 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {user.role === 0 ? 'Admin' : 'User'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.email || 'No email'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.emailVerified ? "Verified" : "Unverified"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button className="text-blue-600 hover:text-blue-900 mr-3">Edit</button>
                        {user.role === 1 && (
                          <button 
                            onClick={() => promoteToAdmin(user.walletAddress)}
                            className="text-green-600 hover:text-green-900 mr-3"
                          >
                            Promote to Admin
                          </button>
                        )}
                        <button className="text-red-600 hover:text-red-900">Ban</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white border-2 border-[#808080] rounded-lg p-6 shadow-lg">
              <h3 className="text-lg font-semibold mb-4">User Growth</h3>
              <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                <p className="text-gray-500">Chart placeholder - User growth over time</p>
              </div>
            </div>

            <div className="bg-white border-2 border-[#808080] rounded-lg p-6 shadow-lg">
              <h3 className="text-lg font-semibold mb-4">Activity Overview</h3>
              <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                <p className="text-gray-500">Chart placeholder - Activity metrics</p>
              </div>
            </div>

            <div className="bg-white border-2 border-[#808080] rounded-lg p-6 shadow-lg">
              <h3 className="text-lg font-semibold mb-4">Post Engagement</h3>
              <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                <p className="text-gray-500">Chart placeholder - Post engagement metrics</p>
              </div>
            </div>

            <div className="bg-white border-2 border-[#808080] rounded-lg p-6 shadow-lg">
              <h3 className="text-lg font-semibold mb-4">Message Volume</h3>
              <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                <p className="text-gray-500">Chart placeholder - Message volume over time</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
