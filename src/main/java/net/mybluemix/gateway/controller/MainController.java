package net.mybluemix.gateway.controller;

import net.mybluemix.gateway.authenticator.LoginAuthProvider;
import net.mybluemix.gateway.dao.DAOFactory;
import net.mybluemix.gateway.dao.LevelDAO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import javax.servlet.ServletContext;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * Basic controller for the main menu page.
 */
@Controller
@RequestMapping("")
public class MainController {

    @SuppressWarnings("SpringJavaAutowiringInspection")
	@Autowired
    ServletContext servletContext;

    /**
     * Play the game.
     * @return the name of the jsp to display
     */
	@RequestMapping("/play")
	public String play(HttpServletRequest request, Model model) {
		model.addAttribute("data", null);
		return "game";
	}

	/**
	 * Save the level.
	 */
	@RequestMapping(value = "/save", method = RequestMethod.POST)
	@ResponseBody
	public String save(HttpServletRequest request, HttpServletResponse response, @RequestParam String data, Model model) {
		model.addAttribute("message", data);
		return data;
	}


	/**
	 * Go to the home page.
	 * @return the name of the jsp to display
	 */
	@RequestMapping("")
	public String home(HttpServletRequest request, Model model) {
		LoginAuthProvider lap = new LoginAuthProvider();
		lap.setServletContext(servletContext);

		LevelDAO dao = DAOFactory.getLevelDAO(servletContext);
		model.addAttribute("message", dao.getLevel("test", ""));
		//model.addAttribute("message", "Hello");
		return "main";
	}

}