/**
 * Login and signup pages (guest-only). The page is detected by which form exists.
 */
CE.page({ access: 'guest' }, () => {
  const { api, auth, flash, ui, utils } = CE;
  const { forms } = ui;

  // Show/hide password toggles
  $('[data-toggle-password]').on('click', function () {
    const $input = $(`#${this.dataset.togglePassword}`);
    const show = $input.attr('type') === 'password';
    $input.attr('type', show ? 'text' : 'password');
    $(this).text(show ? 'Hide' : 'Show').attr('aria-pressed', String(show));
  });

  /* ---------- Login ---------- */
  const $login = $('#login-form');
  if ($login.length) {
    $('#email').val(utils.param('email') || '');

    $login.on('submit', async (e) => {
      e.preventDefault();
      const values = forms.values($login);
      const valid = forms.validate($login, {
        email: forms.emailError,
        password: (v) => !v && 'Password is required.',
      });
      if (!valid) return;

      const $button = $login.find('[type=submit]');
      ui.busy($button, true, 'Signing in…');
      try {
        const { token, user } = await api.post('/auth/login', { email: values.email, password: $('#password').val() });
        auth.save(token, user, $('#remember').is(':checked'));
        flash.set('success', `Welcome back, ${user.full_name.split(' ')[0]}!`);
        window.location.replace(utils.safeNext(utils.param('next')) || auth.homeFor(user));
      } catch (error) {
        ui.busy($button, false);
        if (error.status === 401) {
          forms.setError($('#password'), 'Incorrect email or password.');
          $('#password').trigger('focus');
        } else {
          ui.handleError(error, () => $login.trigger('submit'));
        }
      }
    });
  }

  /* ---------- Signup ---------- */
  const $signup = $('#signup-form');
  if ($signup.length) {
    forms.strengthMeter($('#password'), $('#password-meter'));

    $signup.on('submit', async (e) => {
      e.preventDefault();
      const values = forms.values($signup);
      const password = $('#password').val();
      const valid = forms.validate($signup, {
        full_name: (v) => (!v ? 'Full name is required.' : v.length < 2 && 'Please enter your full name.'),
        email: forms.emailError,
        password: () => (!password ? 'Password is required.' : !forms.isStrongPassword(password) && 'Use 8+ characters with upper and lower case letters, a number and a special character.'),
        confirm_password: () => (!$('#confirm_password').val() ? 'Please confirm your password.' : $('#confirm_password').val() !== password && 'Passwords do not match.'),
      });
      if (!valid) return;

      const $button = $signup.find('[type=submit]');
      ui.busy($button, true, 'Creating account…');
      try {
        await api.post('/auth/signup', { full_name: values.full_name, email: values.email, password });
        flash.set('success', 'Account created! Please sign in.');
        window.location.replace(`login.html?email=${encodeURIComponent(values.email)}`);
      } catch (error) {
        ui.busy($button, false);
        if (error.status === 409) {
          forms.setError($('#email'), 'An account with this email already exists.');
          $('#email').trigger('focus');
        } else {
          ui.handleError(error, () => $signup.trigger('submit'));
        }
      }
    });
  }
});
