package net.mybluemix.gateway.model;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;

/**
 * User details for authentication.
 * Based on https://www.isostech.com/blogs/software-development/adding-google-authentication-spring-security-application/
 */
public class UserAccount implements UserDetails {
	private String openIdIdentifier = null;
	private String username = null;
	private String emailAddress = null;
	private boolean enabled = false;
	private boolean accountNonLocked = true;
	private boolean accountNonExpired = true;
	private boolean credentialsNonExpired = true;

	@Override
	public Collection<? extends GrantedAuthority> getAuthorities() {
		return null;
	}

	@Override
	public String getPassword() {
		return null;
	}

	@Override
	public String getUsername() {
		return null;
	}

	@Override
	public boolean isAccountNonExpired() {
		return false;
	}

	@Override
	public boolean isAccountNonLocked() {
		return false;
	}

	@Override
	public boolean isCredentialsNonExpired() {
		return false;
	}

	@Override
	public boolean isEnabled() {
		return false;
	}
}
