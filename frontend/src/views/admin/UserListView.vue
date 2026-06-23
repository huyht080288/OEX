<template>
  <section>
    <header class="page-header page-header--row">
      <div>
        <h2 class="page-header__title">User Management</h2>
        <p class="page-header__subtitle">Create and manage user accounts.</p>
      </div>
      <button type="button" class="btn btn--primary" @click="openCreate">Add User</button>
    </header>

    <div class="toolbar">
      <label class="field field--inline">
        <span class="field__label">Role</span>
        <select v-model="roleFilter" class="field__input" @change="load">
          <option value="">All roles</option>
          <option value="ADMIN">Admin</option>
          <option value="TEACHER">Teacher</option>
          <option value="STUDENT">Student</option>
        </select>
      </label>
      <label class="field field--inline field--grow">
        <span class="field__label">Search</span>
        <input
          v-model="search"
          class="field__input"
          type="search"
          placeholder="Email or name"
          @keyup.enter="load"
        />
      </label>
      <button type="button" class="btn btn--secondary" @click="load">Search</button>
    </div>

    <LoadingState v-if="loading" message="Loading users…" />
    <ErrorState v-else-if="error" :message="error" @retry="load" />
    <EmptyState
      v-else-if="!users.length"
      title="No users found"
      description="Try a different search or create a new user."
      action-label="Add User"
      @action="openCreate"
    />
    <div v-else class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th class="data-table__actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id">
            <td>{{ user.fullName }}</td>
            <td>{{ user.email }}</td>
            <td>{{ roleLabel(user.role) }}</td>
            <td>
              <StatusBadge :status="user.isActive ? 'ACTIVE' : 'INACTIVE'" />
            </td>
            <td class="data-table__actions">
              <button type="button" class="btn btn--ghost btn--sm" @click="openEdit(user)">
                Edit
              </button>
              <button
                type="button"
                class="btn btn--ghost btn--sm"
                @click="toggleStatus(user)"
              >
                {{ user.isActive ? 'Deactivate' : 'Activate' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <dialog ref="dialogRef" class="modal" @close="onDialogClose">
      <form class="modal__body" @submit.prevent="saveUser">
        <h3 class="modal__title">{{ editingId ? 'Edit User' : 'Add User' }}</h3>
        <div class="form-grid">
          <label class="field form-grid--full">
            <span class="field__label">Full name</span>
            <input v-model="form.fullName" class="field__input" required maxlength="255" />
          </label>
          <label class="field form-grid--full">
            <span class="field__label">Email</span>
            <input
              v-model="form.email"
              class="field__input"
              type="email"
              required
              :disabled="!!editingId"
            />
          </label>
          <label v-if="!editingId" class="field form-grid--full">
            <span class="field__label">Password</span>
            <input
              v-model="form.password"
              class="field__input"
              type="password"
              required
              minlength="8"
              autocomplete="new-password"
            />
          </label>
          <label class="field">
            <span class="field__label">Role</span>
            <select v-model="form.role" class="field__input" required>
              <option value="ADMIN">Admin</option>
              <option value="TEACHER">Teacher</option>
              <option value="STUDENT">Student</option>
            </select>
          </label>
        </div>
        <p v-if="formError" class="form-error">{{ formError }}</p>
        <div class="modal__actions">
          <button type="button" class="btn btn--secondary" @click="closeDialog">Cancel</button>
          <button type="submit" class="btn btn--primary" :disabled="saving">
            {{ saving ? 'Saving…' : 'Save User' }}
          </button>
        </div>
      </form>
    </dialog>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import LoadingState from '@/components/ui/LoadingState.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import ErrorState from '@/components/ui/ErrorState.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import {
  fetchUsers,
  createUser,
  updateUser,
  updateUserStatus,
  type User,
} from '@/api/users';
import { getErrorMessage } from '@/api/client';
import { useToast } from '@/composables/useToast';
import type { Role } from '@/types/api';

const { showToast } = useToast();

const users = ref<User[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const roleFilter = ref<Role | ''>('');
const search = ref('');
const dialogRef = ref<HTMLDialogElement | null>(null);
const editingId = ref<string | null>(null);
const saving = ref(false);
const formError = ref<string | null>(null);

const form = reactive({
  email: '',
  password: '',
  fullName: '',
  role: 'STUDENT' as Role,
});

function roleLabel(role: Role) {
  switch (role) {
    case 'ADMIN':
      return 'Admin';
    case 'TEACHER':
      return 'Teacher';
    case 'STUDENT':
      return 'Student';
    default:
      return role;
  }
}

async function load() {
  loading.value = true;
  error.value = null;
  try {
    users.value = await fetchUsers({
      role: roleFilter.value || undefined,
      search: search.value.trim() || undefined,
    });
  } catch (err) {
    error.value = getErrorMessage(err);
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  form.email = '';
  form.password = '';
  form.fullName = '';
  form.role = 'STUDENT';
  formError.value = null;
  editingId.value = null;
}

function openCreate() {
  resetForm();
  dialogRef.value?.showModal();
}

function openEdit(user: User) {
  editingId.value = user.id;
  form.email = user.email;
  form.password = '';
  form.fullName = user.fullName;
  form.role = user.role;
  formError.value = null;
  dialogRef.value?.showModal();
}

function closeDialog() {
  dialogRef.value?.close();
}

function onDialogClose() {
  resetForm();
}

async function saveUser() {
  saving.value = true;
  formError.value = null;
  try {
    if (editingId.value) {
      await updateUser(editingId.value, {
        fullName: form.fullName.trim(),
        role: form.role,
      });
      showToast('User updated.');
    } else {
      await createUser({
        email: form.email.trim(),
        password: form.password,
        fullName: form.fullName.trim(),
        role: form.role,
      });
      showToast('User created.');
    }
    closeDialog();
    await load();
  } catch (err) {
    formError.value = getErrorMessage(err);
  } finally {
    saving.value = false;
  }
}

async function toggleStatus(user: User) {
  const action = user.isActive ? 'deactivate' : 'activate';
  if (!window.confirm(`${action.charAt(0).toUpperCase()}${action.slice(1)} ${user.fullName}?`)) {
    return;
  }
  try {
    await updateUserStatus(user.id, !user.isActive);
    showToast(user.isActive ? 'User deactivated.' : 'User activated.');
    await load();
  } catch (err) {
    window.alert(getErrorMessage(err));
  }
}

onMounted(load);
</script>

<style scoped>
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: flex-end;
  margin-bottom: 1.25rem;
}

.field--inline {
  margin: 0;
}

.field--grow {
  flex: 1;
  min-width: 12rem;
}
</style>
