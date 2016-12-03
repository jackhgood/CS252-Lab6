package net.mybluemix.gateway.service;

import net.mybluemix.gateway.model.UserAccount;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

/**
 * Created by jackh_000 on 12/1/2016.
 */

public class OpenIdUserDetailsService implements UserDetailsService {

	public UserDetails loadUserByUsername(String openIdIdentifier) {
//		UserAccount userAccount = userAccountRepositoryService.findUserAccountsByOpenIdIdentifier(openIdIdentifier).getSingleResult();
//		if (userAccount == null) {
//			throw new UsernameNotFoundException(openIdIdentifier);
//		} else {
//			if (!userAccount.isEnabled()) {
//				throw new DisabledException("User is disabled");
//			}
//		}
		System.out.println(openIdIdentifier);
		UserAccount userAccount = new UserAccount();
		return userAccount;
	}

}
