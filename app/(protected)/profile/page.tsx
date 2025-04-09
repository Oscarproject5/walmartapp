'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { User as UserIcon, Store, CreditCard, MapPin, LogOut, Upload, Camera } from 'lucide-react';
import { useAuth } from '../../context/auth-context';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { User } from '@supabase/supabase-js';

// Extended user type for profile data
interface ExtendedUser extends User {
  first_name?: string;
  last_name?: string;
  company_name?: string;
  business_type?: string;
  tax_id?: string;
  walmart_seller_id?: string;
  amazon_seller_id?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
  profile_image_url?: string;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState('personal');
  const [profileData, setProfileData] = useState<ExtendedUser | null>(null);

  // Fetch additional profile data from the database
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
        } else {
          // Merge auth user with profile data
          setProfileData({ ...user, ...data });
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [user, supabase]);

  const refreshProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error refreshing profile:', error);
      } else {
        // Merge auth user with profile data
        setProfileData({ ...user, ...data });
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const formData = new FormData(e.currentTarget);
      
      // Process form data based on active tab
      const updates: any = {
        updated_at: new Date().toISOString()
      };
      
      if (activeTab === 'personal') {
        updates.first_name = formData.get('first_name') as string;
        updates.last_name = formData.get('last_name') as string;
        updates.phone = formData.get('phone') as string;
        // Email is managed by auth and can't be updated here
      } else if (activeTab === 'business') {
        updates.company_name = formData.get('company_name') as string;
        updates.business_type = formData.get('business_type') as string;
        updates.tax_id = formData.get('tax_id') as string;
        updates.walmart_seller_id = formData.get('walmart_seller_id') as string;
        updates.amazon_seller_id = formData.get('amazon_seller_id') as string;
      } else if (activeTab === 'address') {
        updates.address_line1 = formData.get('address_line1') as string;
        updates.address_line2 = formData.get('address_line2') as string;
        updates.city = formData.get('city') as string;
        updates.state = formData.get('state') as string;
        updates.postal_code = formData.get('postal_code') as string;
        updates.country = formData.get('country') as string;
      }

      if (!user) {
        throw new Error('User profile not found');
      }

      // Update user profile
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      setMessage({ 
        type: 'success', 
        text: 'Profile updated successfully' 
      });
      
      // Refresh profile data
      await refreshProfile();
      toast.success('Profile updated');
      
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ 
        type: 'error', 
        text: 'Failed to update profile' 
      });
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Redirect to login page
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const files = e.target.files;
      if (!files || files.length === 0) {
        toast.error('No file selected');
        return;
      }
      
      const file = files[0];
      
      // Check file size (limit to 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error('File size exceeds 2MB limit');
        return;
      }
      
      // Validate file type
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const validTypes = ['jpg', 'jpeg', 'png', 'gif'];
      
      if (!fileExt || !validTypes.includes(fileExt)) {
        toast.error('Invalid file type. Please upload a JPG, PNG, or GIF image');
        return;
      }
      
      toast.loading('Processing image...');
      
      // Convert image to Base64 instead of using Supabase Storage
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = async () => {
        const base64Image = reader.result as string;
        
        if (!base64Image) {
          toast.dismiss();
          toast.error('Failed to process image');
          return;
        }
        
        // Update profile with base64 image
        if (!user) {
          toast.dismiss();
          toast.error('User authentication required');
          return;
        }
        
        // Update profile with base64 image data
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ profile_image_url: base64Image })
          .eq('id', user.id);
          
        if (updateError) {
          console.error('Profile update error:', updateError);
          toast.dismiss();
          toast.error(`Failed to update profile: ${updateError.message}`);
          return;
        }
        
        // Refresh profile data
        toast.dismiss();
        toast.success('Profile image updated');
        await refreshProfile();
      };
      
      reader.onerror = (error) => {
        console.error('Error reading file:', error);
        toast.dismiss();
        toast.error('Failed to read image file');
      };
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.dismiss();
      toast.error(`Upload failed: ${error?.message || 'Unknown error'}`);
    }
  };

  // Show login prompt if not authenticated
  if (!user && !loading) {
    return (
      <div className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6 text-center">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Authentication Required
              </h3>
              <p className="text-gray-500 mb-6">
                You need to be logged in to view and manage your profile.
              </p>
              <div className="mt-5">
                <a
                  href="/login"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Go to Login
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">My Profile</h1>
          <button
            onClick={handleSignOut}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </button>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
          <div className="border-b border-gray-200 px-4 py-5 sm:px-6 flex items-center">
            {/* Profile Image */}
            <div className="relative mr-5">
              <div className="h-24 w-24 rounded-full overflow-hidden bg-gray-100 border border-gray-200">
                {profileData?.profile_image_url ? (
                  <img 
                    src={profileData.profile_image_url} 
                    alt="Profile" 
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-gray-100">
                    <UserIcon className="h-12 w-12 text-gray-400" />
                  </div>
                )}
              </div>
              <label htmlFor="profile-image" className="absolute bottom-0 right-0 flex items-center justify-center h-8 w-8 rounded-full bg-indigo-600 cursor-pointer">
                <Camera className="h-4 w-4 text-white" />
                <input 
                  type="file" 
                  id="profile-image" 
                  className="sr-only" 
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </label>
            </div>
            
            {/* User Summary */}
            <div>
              <h2 className="text-lg font-medium text-gray-900">
                {profileData?.first_name || ''} {profileData?.last_name || ''}
              </h2>
              <p className="mt-1 text-sm text-gray-500">{user?.email}</p>
              {profileData?.company_name && (
                <p className="text-sm text-gray-500 flex items-center mt-1">
                  <Store className="h-4 w-4 mr-1 text-gray-400" />
                  {profileData.company_name}
                </p>
              )}
            </div>
          </div>
          
          {/* Profile Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('personal')}
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm flex items-center ${
                  activeTab === 'personal'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <UserIcon className="h-4 w-4 mr-2" />
                Personal Information
              </button>
              <button
                onClick={() => setActiveTab('business')}
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm flex items-center ${
                  activeTab === 'business'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Store className="h-4 w-4 mr-2" />
                Business Details
              </button>
              <button
                onClick={() => setActiveTab('address')}
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm flex items-center ${
                  activeTab === 'address'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <MapPin className="h-4 w-4 mr-2" />
                Address
              </button>
            </nav>
          </div>

          {/* Profile Form */}
          <div className="px-4 py-5 sm:px-6">
            <form onSubmit={handleSubmit}>
              {activeTab === 'personal' && (
                <div className="grid grid-cols-6 gap-6">
                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">
                      First name
                    </label>
                    <input
                      type="text"
                      name="first_name"
                      id="first_name"
                      defaultValue={profileData?.first_name || ''}
                      className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">
                      Last name
                    </label>
                    <input
                      type="text"
                      name="last_name"
                      id="last_name"
                      defaultValue={profileData?.last_name || ''}
                      className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-4">
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email address
                    </label>
                    <input
                      type="email"
                      name="email"
                      id="email"
                      defaultValue={user?.email || ''}
                      disabled
                      className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md bg-gray-50"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Email cannot be changed. Please contact support if needed.
                    </p>
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                      Phone number
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      id="phone"
                      defaultValue={profileData?.phone || ''}
                      className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'business' && (
                <div className="grid grid-cols-6 gap-6">
                  <div className="col-span-6 sm:col-span-4">
                    <label htmlFor="company_name" className="block text-sm font-medium text-gray-700">
                      Company name
                    </label>
                    <input
                      type="text"
                      name="company_name"
                      id="company_name"
                      defaultValue={profileData?.company_name || ''}
                      className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="business_type" className="block text-sm font-medium text-gray-700">
                      Business type
                    </label>
                    <select
                      id="business_type"
                      name="business_type"
                      defaultValue={profileData?.business_type || ''}
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    >
                      <option value="">Select a type</option>
                      <option value="sole_proprietorship">Sole Proprietorship</option>
                      <option value="llc">LLC</option>
                      <option value="corporation">Corporation</option>
                      <option value="partnership">Partnership</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="tax_id" className="block text-sm font-medium text-gray-700">
                      Tax ID / EIN
                    </label>
                    <input
                      type="text"
                      name="tax_id"
                      id="tax_id"
                      defaultValue={profileData?.tax_id || ''}
                      className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="walmart_seller_id" className="block text-sm font-medium text-gray-700">
                      Walmart Seller ID
                    </label>
                    <input
                      type="text"
                      name="walmart_seller_id"
                      id="walmart_seller_id"
                      defaultValue={profileData?.walmart_seller_id || ''}
                      className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="amazon_seller_id" className="block text-sm font-medium text-gray-700">
                      Amazon Seller ID
                    </label>
                    <input
                      type="text"
                      name="amazon_seller_id"
                      id="amazon_seller_id"
                      defaultValue={profileData?.amazon_seller_id || ''}
                      className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'address' && (
                <div className="grid grid-cols-6 gap-6">
                  <div className="col-span-6">
                    <label htmlFor="address_line1" className="block text-sm font-medium text-gray-700">
                      Street address
                    </label>
                    <input
                      type="text"
                      name="address_line1"
                      id="address_line1"
                      defaultValue={profileData?.address_line1 || ''}
                      className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>

                  <div className="col-span-6">
                    <label htmlFor="address_line2" className="block text-sm font-medium text-gray-700">
                      Address line 2
                    </label>
                    <input
                      type="text"
                      name="address_line2"
                      id="address_line2"
                      defaultValue={profileData?.address_line2 || ''}
                      className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-3 lg:col-span-2">
                    <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                      City
                    </label>
                    <input
                      type="text"
                      name="city"
                      id="city"
                      defaultValue={profileData?.city || ''}
                      className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-3 lg:col-span-2">
                    <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                      State / Province
                    </label>
                    <input
                      type="text"
                      name="state"
                      id="state"
                      defaultValue={profileData?.state || ''}
                      className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-3 lg:col-span-2">
                    <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700">
                      ZIP / Postal code
                    </label>
                    <input
                      type="text"
                      name="postal_code"
                      id="postal_code"
                      defaultValue={profileData?.postal_code || ''}
                      className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="country" className="block text-sm font-medium text-gray-700">
                      Country
                    </label>
                    <select
                      id="country"
                      name="country"
                      defaultValue={profileData?.country || 'United States'}
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    >
                      <option value="United States">United States</option>
                      <option value="Canada">Canada</option>
                      <option value="Mexico">Mexico</option>
                    </select>
                  </div>
                </div>
              )}

              {message.text && (
                <div className={`mt-6 rounded-md p-4 ${
                  message.type === 'error' 
                    ? 'bg-red-50 border border-red-200 text-red-700' 
                    : 'bg-green-50 border border-green-200 text-green-700'
                }`}>
                  {message.text}
                </div>
              )}

              <div className="flex justify-end mt-6">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
        
        {/* Account Information */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Account Information</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Your account details and membership information.
            </p>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
            <dl className="sm:divide-y sm:divide-gray-200">
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Account created</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {user?.created_at 
                    ? new Date(user.created_at).toLocaleDateString('en-US', {
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric'
                      })
                    : 'Unknown'}
                </dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Account status</dt>
                <dd className="mt-1 text-sm sm:mt-0 sm:col-span-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                </dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Two-factor authentication</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <button 
                    type="button"
                    className="inline-flex items-center px-3 py-1.5 border border-indigo-300 shadow-sm text-xs font-medium rounded text-indigo-700 bg-indigo-50 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Enable
                  </button>
                </dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Password</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <button 
                    type="button"
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Change password
                  </button>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
} 