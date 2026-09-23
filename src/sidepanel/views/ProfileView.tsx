import React, { useState } from 'react';
import { UserProfile, EducationRecord, EmploymentRecord, ResearchRecord, ProjectRecord, ResumeRecord } from '../../shared/schemas/profile';
import { Plus, Trash2, Save, FileText, Check, ChevronDown, ChevronRight } from 'lucide-react';

interface ProfileViewProps {
  profile: UserProfile;
  onSaveProfile: (profile: UserProfile) => Promise<void>;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ profile, onSaveProfile }) => {
  const [formData, setFormData] = useState<UserProfile>(profile);
  const [isSaved, setIsSaved] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string>('personal');

  const toggleSection = (s: string) => {
    setExpandedSection(expandedSection === s ? '' : s);
  };

  const handleSave = async () => {
    await onSaveProfile(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const addEducation = () => {
    const newEdu: EducationRecord = {
      id: `edu_${Date.now()}`,
      school: '',
      degree: '',
      fieldOfStudy: '',
      current: false,
      achievements: [],
    };
    setFormData({ ...formData, education: [...formData.education, newEdu] });
  };

  const addEmployment = () => {
    const newEmp: EmploymentRecord = {
      id: `emp_${Date.now()}`,
      employer: '',
      role: '',
      startDate: '',
      current: false,
      description: '',
      highlights: [],
    };
    setFormData({ ...formData, employment: [...formData.employment, newEmp] });
  };

  const addProject = () => {
    const newProj: ProjectRecord = {
      id: `proj_${Date.now()}`,
      title: '',
      description: '',
      technologies: [],
      highlights: [],
    };
    setFormData({ ...formData, projects: [...formData.projects, newProj] });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '14px', fontWeight: 600 }}>Candidate Profile</h2>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Deterministic autofill source</span>
        </div>
        <button
          onClick={handleSave}
          style={{
            height: '36px',
            padding: '0 12px',
            backgroundColor: isSaved ? 'var(--success)' : 'var(--accent-primary)',
            color: '#fff',
            borderRadius: 'var(--radius-md)',
            fontSize: '12px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          {isSaved ? <Check size={14} /> : <Save size={14} />}
          {isSaved ? 'Saved' : 'Save Profile'}
        </button>
      </div>

      {/* 1. Personal & Contact Info */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        <button
          onClick={() => toggleSection('personal')}
          style={{
            width: '100%',
            padding: '10px 12px',
            backgroundColor: 'var(--bg-surface)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontWeight: 600,
            fontSize: '12px',
          }}
        >
          <span>Personal & Contact Information</span>
          {expandedSection === 'personal' ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        {expandedSection === 'personal' && (
          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: 'var(--bg-surface-subtle)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>First Name</label>
                <input
                  type="text"
                  value={formData.personal.firstName}
                  onChange={(e) => setFormData({ ...formData, personal: { ...formData.personal, firstName: e.target.value } })}
                  style={{ width: '100%', fontSize: '12px', padding: '4px 6px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Last Name</label>
                <input
                  type="text"
                  value={formData.personal.lastName}
                  onChange={(e) => setFormData({ ...formData, personal: { ...formData.personal, lastName: e.target.value } })}
                  style={{ width: '100%', fontSize: '12px', padding: '4px 6px' }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Email</label>
              <input
                type="email"
                value={formData.personal.email}
                onChange={(e) => setFormData({ ...formData, personal: { ...formData.personal, email: e.target.value } })}
                style={{ width: '100%', fontSize: '12px', padding: '4px 6px' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Phone</label>
                <input
                  type="tel"
                  value={formData.personal.phone || ''}
                  onChange={(e) => setFormData({ ...formData, personal: { ...formData.personal, phone: e.target.value } })}
                  style={{ width: '100%', fontSize: '12px', padding: '4px 6px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>City, State</label>
                <input
                  type="text"
                  value={`${formData.personal.city || ''}, ${formData.personal.region || ''}`}
                  onChange={(e) => {
                    const parts = e.target.value.split(',');
                    setFormData({
                      ...formData,
                      personal: { ...formData.personal, city: parts[0]?.trim(), region: parts[1]?.trim() },
                    });
                  }}
                  style={{ width: '100%', fontSize: '12px', padding: '4px 6px' }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Public Links */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        <button
          onClick={() => toggleSection('links')}
          style={{
            width: '100%',
            padding: '10px 12px',
            backgroundColor: 'var(--bg-surface)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontWeight: 600,
            fontSize: '12px',
          }}
        >
          <span>Online Profiles & Links</span>
          {expandedSection === 'links' ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        {expandedSection === 'links' && (
          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: 'var(--bg-surface-subtle)' }}>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>LinkedIn</label>
              <input
                type="url"
                value={formData.links.linkedin || ''}
                onChange={(e) => setFormData({ ...formData, links: { ...formData.links, linkedin: e.target.value } })}
                style={{ width: '100%', fontSize: '12px', padding: '4px 6px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>GitHub</label>
              <input
                type="url"
                value={formData.links.github || ''}
                onChange={(e) => setFormData({ ...formData, links: { ...formData.links, github: e.target.value } })}
                style={{ width: '100%', fontSize: '12px', padding: '4px 6px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Portfolio / Personal Website</label>
              <input
                type="url"
                value={formData.links.portfolio || ''}
                onChange={(e) => setFormData({ ...formData, links: { ...formData.links, portfolio: e.target.value } })}
                style={{ width: '100%', fontSize: '12px', padding: '4px 6px' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 3. Education Records */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        <button
          onClick={() => toggleSection('education')}
          style={{
            width: '100%',
            padding: '10px 12px',
            backgroundColor: 'var(--bg-surface)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontWeight: 600,
            fontSize: '12px',
          }}
        >
          <span>Education ({formData.education.length})</span>
          {expandedSection === 'education' ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        {expandedSection === 'education' && (
          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: 'var(--bg-surface-subtle)' }}>
            {formData.education.map((edu, idx) => (
              <div key={edu.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '8px', position: 'relative' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <div>
                    <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>School / University</label>
                    <input
                      type="text"
                      value={edu.school}
                      onChange={(e) => {
                        const copy = [...formData.education];
                        copy[idx].school = e.target.value;
                        setFormData({ ...formData, education: copy });
                      }}
                      style={{ width: '100%', fontSize: '11px', padding: '3px 6px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Degree</label>
                    <input
                      type="text"
                      value={edu.degree}
                      onChange={(e) => {
                        const copy = [...formData.education];
                        copy[idx].degree = e.target.value;
                        setFormData({ ...formData, education: copy });
                      }}
                      style={{ width: '100%', fontSize: '11px', padding: '3px 6px' }}
                    />
                  </div>
                </div>
                <div style={{ marginTop: '4px' }}>
                  <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Field of Study</label>
                  <input
                    type="text"
                    value={edu.fieldOfStudy}
                    onChange={(e) => {
                      const copy = [...formData.education];
                      copy[idx].fieldOfStudy = e.target.value;
                      setFormData({ ...formData, education: copy });
                    }}
                    style={{ width: '100%', fontSize: '11px', padding: '3px 6px' }}
                  />
                </div>
              </div>
            ))}
            <button
              onClick={addEducation}
              style={{
                fontSize: '11px',
                padding: '4px 8px',
                border: '1px dashed var(--border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
              }}
            >
              <Plus size={12} /> Add Education Record
            </button>
          </div>
        )}
      </div>

      {/* 4. Resumes */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        <button
          onClick={() => toggleSection('resumes')}
          style={{
            width: '100%',
            padding: '10px 12px',
            backgroundColor: 'var(--bg-surface)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontWeight: 600,
            fontSize: '12px',
          }}
        >
          <span>Stored Resumes ({formData.resumes.length})</span>
          {expandedSection === 'resumes' ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        {expandedSection === 'resumes' && (
          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: 'var(--bg-surface-subtle)' }}>
            {formData.resumes.map((res) => (
              <div
                key={res.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 8px',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={14} color="var(--accent-primary)" />
                  <span style={{ fontSize: '11px', fontWeight: 500 }}>{res.name}</span>
                  {res.isDefault && (
                    <span style={{ fontSize: '9px', backgroundColor: 'var(--accent-subtle)', color: 'var(--accent-primary)', padding: '1px 4px', borderRadius: '4px' }}>
                      Default
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
