import React, { useState } from 'react';
import { UserProfile, EducationRecord, ResumeRecord } from '../../shared/schemas/profile';
import { Plus, Save, FileText, Check, ChevronDown, ChevronRight, Upload, Trash2, Star } from 'lucide-react';

interface ProfileViewProps {
  profile: UserProfile;
  onSaveProfile: (profile: UserProfile) => Promise<void>;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ profile, onSaveProfile }) => {
  const [formData, setFormData] = useState<UserProfile>(profile);
  const [isSaved, setIsSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string>('personal');
  const [resumeError, setResumeError] = useState<string | null>(null);
  const missingProfileItems = [
    !formData.personal.firstName && 'name',
    !formData.personal.email && 'email',
    !formData.links.linkedin && 'LinkedIn URL',
    !formData.links.github && 'GitHub URL',
  ].filter(Boolean) as string[];

  const toggleSection = (s: string) => {
    setExpandedSection(expandedSection === s ? '' : s);
  };

  const handleSave = async () => {
    setSaveError(null);
    try {
      await onSaveProfile(formData);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch {
      setSaveError('Profile was not saved. Check incomplete education records and other required fields. Your previously saved profile is unchanged.');
    }
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

  const saveResumeList = async (resumes: ResumeRecord[]) => {
    const updated = { ...formData, resumes };
    setFormData(updated);
    await onSaveProfile(updated);
  };

  const handleResumeUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setResumeError(null);

    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension !== 'pdf' && extension !== 'docx') {
      setResumeError('Use a PDF or DOCX resume.');
      return;
    }
    if (file.size > 4.5 * 1024 * 1024) {
      setResumeError('Resume must be smaller than 4.5 MB so Chrome can store it locally.');
      return;
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    const resume: ResumeRecord = {
      id: `resume_${Date.now()}`,
      name: file.name,
      fileType: extension,
      dataUrl,
      tags: [],
      isDefault: formData.resumes.length === 0,
      targetRoles: [],
      updatedAt: new Date().toISOString(),
    };
    await saveResumeList([...formData.resumes, resume]);
  };

  const setDefaultResume = async (id: string) => {
    await saveResumeList(formData.resumes.map((resume) => ({ ...resume, isDefault: resume.id === id })));
  };

  const removeResume = async (id: string) => {
    const remaining = formData.resumes.filter((resume) => resume.id !== id);
    if (remaining.length > 0 && !remaining.some((resume) => resume.isDefault)) {
      remaining[0] = { ...remaining[0], isDefault: true };
    }
    await saveResumeList(remaining);
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
            height: '34px',
            padding: '0 14px',
            background: isSaved ? 'var(--success)' : 'var(--accent-gradient)',
            color: '#fff',
            borderRadius: 'var(--radius-full)',
            fontSize: '12px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 8px rgba(49, 125, 159, 0.25)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          {isSaved ? <Check size={14} /> : <Save size={14} />}
          {isSaved ? 'Saved' : 'Save Profile'}
        </button>
      </div>

      {saveError && <p role="alert" style={{ color: 'var(--danger)', fontSize: '12px' }}>{saveError}</p>}
      {missingProfileItems.length > 0 && (
        <button
          onClick={() => setExpandedSection(missingProfileItems.includes('email') ? 'personal' : 'links')}
          style={{
            padding: '10px 12px',
            border: '1px solid var(--warning-border)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--warning-bg)',
            color: 'var(--text-secondary)',
            textAlign: 'left',
            fontSize: '11px',
            lineHeight: 1.5,
          }}
        >
          <strong style={{ color: 'var(--warning)' }}>Review missing autofill data:</strong>{' '}
          {missingProfileItems.join(', ')}. No usable values were recovered for these fields. Check their labels in the knowledge base, or add them here.
        </button>
      )}

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
                  value={[formData.personal.city, formData.personal.region].filter(Boolean).join(', ')}
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
            <label className="zen-upload-button">
              <Upload size={14} /> Upload and store resume
              <input type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={handleResumeUpload} hidden />
            </label>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              Stored locally. The selected default resume is attached when a form has a file-upload field.
            </span>
            {resumeError && <span style={{ fontSize: '10px', color: 'var(--danger)' }}>{resumeError}</span>}
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
                <div style={{ display: 'flex', gap: '4px' }}>
                  {!res.isDefault && (
                    <button onClick={() => setDefaultResume(res.id)} title="Make default" className="icon-button">
                      <Star size={13} />
                    </button>
                  )}
                  <button onClick={() => removeResume(res.id)} title="Remove resume" className="icon-button danger">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
